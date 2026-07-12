'use client';

import { useState } from 'react';
import {
  Badge,
  Button,
  ConfirmDeleteDialog,
  DeleteButton,
  EditButton,
  Loading,
} from '@byte-of-me/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Plus } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

import { CompanyDialog } from './company-dialog';

import { createCompany } from '@/entities/company/api/create-company';
import { deleteCompany } from '@/entities/company/api/delete-company';
import { getAllAdminCompanies } from '@/entities/company/api/get-all-admin-companies';
import { updateCompany } from '@/entities/company/api/update-company';
import type { CompanyFormValues } from '@/entities/company/model/company-schema';
import type { AdminCompany } from '@/entities/company/model/types';
import { formatDate } from '@/shared/lib/utils';
import { ManagerListState, ManagerPageHeader } from '@/shared/ui';

export function CompanyManager() {
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState<AdminCompany | null>(null);
  const [open, setOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<AdminCompany | null>(
    null
  );

  const {
    data: response,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['companies'],
    queryFn: getAllAdminCompanies,
  });

  const companies = response?.success ? response.data : [];

  const saveMutation = useMutation({
    mutationFn: (values: CompanyFormValues) =>
      editing ? updateCompany(editing.id, values) : createCompany(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast(editing ? 'Work experience updated' : 'Work experience created');
      setOpen(false);
    },
    onError: () => toast.error('Error saving work experience'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast('Work experience removed');
      setCompanyToDelete(null);
    },
    onError: () => toast.error('Error deleting work experience'),
  });

  const handleCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  const handleEdit = (company: AdminCompany) => {
    setEditing(company);
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        title="Work Experience"
        description="Maintain your professional timeline and company records"
        action={
          <Button onClick={handleCreate} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Experience
          </Button>
        }
      />

      <div className="relative min-h-[200px] space-y-4">
        <ManagerListState
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          isEmpty={companies.length === 0}
          emptyTitle="No work experience"
          emptyDescription="Start by adding the first company you worked with."
          emptyAction={
            <Button variant="outline" size="sm" onClick={handleCreate}>
              Add Your First Entry
            </Button>
          }
          skeleton={
            <div className="flex h-48 flex-col items-center justify-center gap-2">
              <Loading />
              <p className="animate-pulse text-xs text-muted-foreground">
                Loading records...
              </p>
            </div>
          }
        >
          <div className="grid gap-4">
            {companies.map((company) => {
              const dateRange = `${formatDate(company.startDate)} — ${
                company.endDate ? formatDate(company.endDate) : 'Present'
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
                          {company.roles.length}{' '}
                          {company.roles.length === 1 ? 'Role' : 'Roles'}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="px-2 py-0 text-[10px]"
                        >
                          {company.techStacks.length} Tech
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                    <EditButton onClick={() => handleEdit(company)} />
                    <DeleteButton
                      isSubmitting={
                        deleteMutation.isPending &&
                        companyToDelete?.id === company.id
                      }
                      onClick={() => setCompanyToDelete(company)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ManagerListState>

        {!isLoading && isFetching && (
          <div className="absolute right-2 top-2">
            <Loading />
          </div>
        )}
      </div>

      <CompanyDialog
        key={editing?.id || 'new'}
        open={open}
        onOpenChange={setOpen}
        initialData={editing}
        onSubmit={(values) => saveMutation.mutate(values)}
        loading={saveMutation.isPending}
      />

      <ConfirmDeleteDialog
        isOpen={!!companyToDelete}
        isLoading={deleteMutation.isPending}
        onClose={() => setCompanyToDelete(null)}
        onConfirm={() =>
          companyToDelete && deleteMutation.mutate(companyToDelete.id)
        }
        description={`Are you sure you want to delete "${
          companyToDelete?.company ?? ''
        }" and all of its roles?`}
      />
    </div>
  );
}
