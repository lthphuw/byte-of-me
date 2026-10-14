'use client';

import { Badge, Button, Pagination } from '@byte-of-me/ui';
import { Briefcase, Plus } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';

import { CompanyDialog } from './company-dialog';

import { createCompany } from '@/entities/company/api/create-company';
import { deleteCompany } from '@/entities/company/api/delete-company';
import { getPaginatedAdminCompanies } from '@/entities/company/api/get-paginated-admin-companies';
import { updateCompany } from '@/entities/company/api/update-company';
import {
  type AdminCompanyListItem,
  type CompanyFormValues,
  companyKeys,
} from '@/entities/company/model';
import { companyQueries, useAdminCompanyById } from '@/entities/company/query';
import { useCrudManager } from '@/shared/hooks/use-crud-manager';
import { formatDate } from '@/shared/lib/utils';
import { ConfirmDeleteDialog, ManagerListState, ManagerPageHeader, RecordListItem, RecordRowActions } from '@/shared/ui';

export function CompanyManager() {
  const t = useTranslations('dashboard.company');
  const tShared = useTranslations('dashboard.shared');
  const tCrud = useTranslations('dashboard.shared.crud');
  const locale = useLocale();
  const {
    items: companies,
    pagination,
    isLoading,
    isError,
    refetch,
    isFetching,
    isPlaceholderData,
    setPage,
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
  } = useCrudManager<AdminCompanyListItem, CompanyFormValues>({
    entity: t('entity'),
    keys: { all: companyKeys.all, detail: companyKeys.detail },
    pageKey: (page) => companyQueries.adminPage(page).queryKey,
    fetchPage: getPaginatedAdminCompanies,
    create: createCompany,
    update: updateCompany,
    remove: deleteCompany,
  });

  // The list row carries no roles or tasks, so the dialog loads the full
  // record by id; "New" (`editing` is null) fetches nothing and opens empty.
  const fullCompany = useAdminCompanyById(editing?.id);

  const pager =
    pagination && pagination.totalPages > 1 ? (
      <div className="mt-6">
        <Pagination
          pagination={pagination}
          setPage={setPage}
          isPlaceholderData={isPlaceholderData}
          pageLabel={tShared('pagination.pageLabel', {
            page: pagination.currentPage,
            totalPages: pagination.totalPages,
          })}
          previousLabel={tShared('pagination.previous')}
          nextLabel={tShared('pagination.next')}
        />
      </div>
    ) : null;

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        title={t('title')}
        description={t('description')}
        action={
          <Button
            onClick={openCreateDialog}
            size="sm"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {t('createButton')}
          </Button>
        }
      />

      <div className="relative min-h-[200px]">
        <ManagerListState
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          isFetching={isFetching}
          isEmpty={companies.length === 0}
          emptyTitle={t('emptyTitle')}
          emptyDescription={t('emptyDescription')}
          emptyAction={
            <Button
              variant="outline"
              size="sm"
              onClick={openCreateDialog}
            >
              {t('emptyAction')}
            </Button>
          }
          pagination={pager}
        >
          <div className="space-y-3">
            {companies.map((company) => {
              const dateRange = `${formatDate(company.startDate, locale)} — ${
                company.endDate
                  ? formatDate(company.endDate, locale)
                  : t('present')
              }`;

              return (
                <RecordListItem
                  key={company.id}
                  leading={
                    <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                      {company.logo?.url ? (
                        <Image
                          src={company.logo.url}
                          alt={company.company}
                          fill
                          sizes="56px"
                          className="object-contain p-2"
                        />
                      ) : (
                        <Briefcase className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                  }
                  actions={
                    <RecordRowActions
                      name={company.company}
                      onEdit={() => openEditDialog(company)}
                      onDelete={() => requestDelete(company)}
                      disabled={isDeletingItem(company)}
                    />
                  }
                >
                  <h4 className="truncate font-semibold leading-none">
                    {company.company}
                  </h4>
                  <p className="truncate pt-1 text-xs font-medium text-muted-foreground">
                    {company.location} · {dateRange}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge
                      variant="secondary"
                      className="px-2 py-0 text-[10px]"
                    >
                      {t('rolesBadge', { count: company._count.roles })}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="px-2 py-0 text-[10px]"
                    >
                      {t('techStackBadge', {
                        count: company._count.techStacks,
                      })}
                    </Badge>
                  </div>
                </RecordListItem>
              );
            })}
          </div>
        </ManagerListState>
      </div>

      <CompanyDialog
        key={editing?.id ?? 'new'}
        open={isDialogOpen}
        onOpenChange={onDialogOpenChange}
        isEditing={Boolean(editing)}
        initialData={fullCompany.record}
        isLoadingInitialData={fullCompany.isNotReady}
        hasLoadError={fullCompany.hasError}
        onRetryLoad={fullCompany.retry}
        onSubmit={(values) => save(values)}
        loading={isSaving}
      />

      <ConfirmDeleteDialog
        open={!!companyToDelete}
        isLoading={isDeleting}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title={tCrud('deleteTitle', { entity: t('entity') })}
        description={tCrud('deleteDescription', {
          name: companyToDelete?.company ?? '',
        })}
      />
    </div>
  );
}
