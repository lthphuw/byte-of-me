'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';

import type { NoteGraph, NoteGraphEdge } from '@/entities/note/model/types';
import { requireAdmin } from '@/shared/lib/auth';
import { getErrorMessage } from '@/shared/lib/utils';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Ceilings on one graph payload. Both reads were whole-corpus and unbounded,
 * so the cost of `/space/notes/graph` grew with the vault forever — and a
 * force-directed layout stops being readable long before a payload that size
 * finishes rendering. Nodes are taken newest-first (the `orderBy` below), so
 * the cap drops the least recently touched notes.
 *
 * Overflowing either cap sets `NoteGraph.truncated`, because a partial graph
 * renders exactly like a complete one and the author has no other way to tell
 * that notes are missing from it.
 */
const MAX_GRAPH_NODES = 1500;
const MAX_GRAPH_EDGES = 5000;

/**
 * The whole knowledge graph, in one owner-scoped read.
 *
 * Two queries rather than one join: the node set and the edge set are
 * different shapes, and a join would repeat every node's title once per edge
 * it touches — on a densely linked corpus that is the same payload several
 * times over. Neither query carries a document, for the reason `getNoteTree`
 * gives: this draws circles and, past a zoom threshold, titles.
 *
 * Folders are excluded because a folder has no document and therefore no
 * links; archived notes are excluded because the graph is a picture of live
 * thinking and the trash has its own view. `degree` is then computed from the
 * edges that SURVIVE that filter, not from the raw link rows — otherwise a
 * note whose only neighbour is in the bin would count as connected, and the
 * unlinked notes this view exists to surface (spec §6.6) would hide.
 */
export async function getNoteGraph(): Promise<ApiResponse<NoteGraph>> {
  const session = await requireAdmin();

  try {
    const owned = { ownerId: session.id, archivedAt: null };

    // One row past each cap, never rendered — the same trick `searchNotes`
    // uses to keep `hasMore` honest. Comparing `length` against the cap alone
    // cannot tell "exactly 1500 notes" from "the first 1500 of more", so an
    // author whose vault landed on the round number would be told forever
    // that the picture was partial when it was complete.
    const [nodeRows, linkRows] = await Promise.all([
      prisma.note.findMany({
        where: { ...owned, isFolder: false },
        select: {
          id: true,
          title: true,
          status: true,
          labels: { select: { labelId: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: MAX_GRAPH_NODES + 1,
      }),
      // Both ends owner-scoped, the same guard `getNoteLinks` applies on the
      // way out: a row naming a note the caller does not own would leak that
      // note's existence, and reading its title back would leak more.
      prisma.noteLink.findMany({
        where: { source: owned, target: owned },
        select: { sourceId: true, targetId: true },
        // Ordered by the composite primary key, so the cap below truncates the
        // same set on every load instead of whatever Postgres returned first.
        orderBy: [{ sourceId: 'asc' }, { targetId: 'asc' }],
        take: MAX_GRAPH_EDGES + 1,
      }),
    ]);

    const truncated =
      nodeRows.length > MAX_GRAPH_NODES || linkRows.length > MAX_GRAPH_EDGES;
    const rows = nodeRows.slice(0, MAX_GRAPH_NODES);
    const links = linkRows.slice(0, MAX_GRAPH_EDGES);

    const ids = new Set(rows.map((row) => row.id));
    const degree = new Map<string, number>();
    const edges: NoteGraphEdge[] = [];

    for (const link of links) {
      // The `where` above cannot express "not a folder" on the related note,
      // so this membership check — not the SQL — is what actually holds the
      // invariant `NoteGraphEdge` documents: both ends exist in `nodes`.
      if (!ids.has(link.sourceId) || !ids.has(link.targetId)) continue;
      edges.push({ source: link.sourceId, target: link.targetId });
      degree.set(link.sourceId, (degree.get(link.sourceId) ?? 0) + 1);
      degree.set(link.targetId, (degree.get(link.targetId) ?? 0) + 1);
    }

    return {
      success: true,
      data: {
        truncated,
        nodes: rows.map((row) => ({
          id: row.id,
          title: row.title,
          status: row.status,
          labelIds: row.labels.map((join) => join.labelId),
          degree: degree.get(row.id) ?? 0,
        })),
        edges,
      },
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to load note graph');
    logger.error(`Get note graph error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}
