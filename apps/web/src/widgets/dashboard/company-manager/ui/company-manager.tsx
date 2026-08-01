'use client';

import {
  Badge,
  Button,
  ConfirmDeleteDialog,
  DeleteButton,
  EditButton,
} from '@byte-of-me/ui';
import { Briefcase, Plus } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { CompanyDialog } from './company-dialog';

import { createCompany } from '@/entities/company/api/create-company';
import { deleteCompany } from '@/entities/company/api/delete-company';
import { getAllAdminCompanies } from '@/entities/company/api/get-all-admin-companies';
import { updateCompany } from '@/entities/company/api/update-company';
import type { CompanyFormValues } from '@/entities/company/model/company-schema';
import { companyKeys } from '@/entities/company/model/query-keys';
import type { AdminCompany } from '@/entities/company/model/types';
import { useCrudManager } from '@/shared/hooks/use-crud-manager';
import { formatDate } from '@/shared/lib/utils';
import { ManagerListState, ManagerPageHeader } from '@/shared/ui';

export function CompanyManager() {
  const t = useTranslations('dashboard.company');
  const tShared = useTranslations('dashboard.shared');
  const {
    items: companies,
    isLoading,
    isError,
    refetch,
    isFetching,
    editing,
    isDialogOpen,
    onDialogOpenChange,
    openCreateDialog,
    openEditDialog,
    save,
    isSaving,
    itemToDelete: companyToDelete,
    requestDelete,
    cancelDelete,
    confirmDelete,
    isDeleting,
    isDeletingItem,
  } = useCrudManager<AdminCompany, CompanyFormValues>({
    queryKey: companyKeys.list(),
    entityLabel: 'Work experience',
    messages: {
      created: t('toast.created'),
      updated: t('toast.updated'),
      deleted: t('toast.deleted'),
      saveError: t('toast.saveError'),
      deleteError: t('toast.deleteError'),
    },
    fetchAll: getAllAdminCompanies,
    create: createCompany,
    update: updateCompany,
    remove: deleteCompany,
  });

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        title={t('title')}
        description={t('description')}
        action={
          <Button onClick={openCreateDialog} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            {t('createButton')}
          </Button>
        }
      />

      <div className="relative min-h-[200px] space-y-4">
        <ManagerListState
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          isFetching={isFetching}
          isEmpty={companies.length === 0}
          emptyTitle={t('emptyTitle')}
          emptyDescription={t('emptyDescription')}
          emptyAction={
            <Button variant="outline" size="sm" onClick={openCreateDialog}>
              {t('emptyAction')}
            </Button>
          }
        >
          <div className="grid gap-4">
            {companies.map((company) => {
              const dateRange = `${formatDate(company.startDate)} — ${
                company.endDate ? formatDate(company.endDate) : t('present')
              }`;

              return (
                <div
                  key={company.id}
                  className="group flex items-center justify-between rounded-xl border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                      {company.logo?.url ? (
                        <Image
                          src={company.logo.url}
                          alt={company.company}
                          fill
                          className="object-contain p-2"
                        />
                      ) : (
                        <Briefcase className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-semibold leading-none">
                        {company.company}
                      </h4>
                      <p className="text-xs font-medium text-muted-foreground">
                        {company.location} · {dateRange}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Badge
                          variant="secondary"
                          className="px-2 py-0 text-[10px]"
                        >
                          {t('rolesBadge', { count: company.roles.length })}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="px-2 py-0 text-[10px]"
                        >
                          {t('techStackBadge', {
                            count: company.techStacks.length,
                          })}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                    <EditButton onClick={() => openEditDialog(company)} />
                    <DeleteButton
                      isSubmitting={isDeletingItem(company)}
                      onClick={() => requestDelete(company)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ManagerListState>
      </div>

      <CompanyDialog
        key={editing?.id || 'new'}
        open={isDialogOpen}
        onOpenChange={onDialogOpenChange}
        initialData={editing}
        onSubmit={(values) => save(values)}
        loading={isSaving}
      />

      <ConfirmDeleteDialog
        isOpen={!!companyToDelete}
        isLoading={isDeleting}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title={t('deleteTitle')}
        description={t.rich('deleteDescription', {
          name: () => (
            <span className="font-semibold text-foreground">
              {companyToDelete?.company ?? ''}
            </span>
          ),
        })}
        actionText={tShared('confirmDelete.actionText')}
        cancelText={tShared('confirmDelete.cancelText')}
      />
    </div>
  );
}
