"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import axios from "axios";
import { Pencil, Trash2, Users } from "lucide-react";

import { api } from "@/lib/api/client";
import type { ApiEnvelope, PaginatedEnvelope } from "@/lib/api/types";
import { updateUserSchema, type UpdateUserInput, type User } from "@/lib/schemas/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { VerifiedBadge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import { RequirePermission } from "@/components/require-permission";
import { Resource, Action, useCan } from "@/lib/api/rbac";
import { ErrorState } from "@/components/error-state";

function apiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) return err.response?.data?.message ?? fallback;
  return fallback;
}

export default function UsersPage() {
  // Backend gates /api/users to users/read (admin + staff). Guard the page so a
  // plain user who reaches the URL is redirected instead of hitting 403s.
  return (
    <RequirePermission resource={Resource.Users} action={Action.Read}>
      <UsersPageContent />
    </RequirePermission>
  );
}

function UsersPageContent() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 10;
  // Editing/deleting users is admin-only (users update/delete). Staff sees the
  // list read-only, so the whole Actions column is hidden for them.
  const canManage =
    useCan(Resource.Users, Action.Update) || useCan(Resource.Users, Action.Delete);
  const cols = canManage ? 6 : 5;

  const [editing, setEditing] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);

  const query = useQuery({
    queryKey: ["users", page],
    queryFn: async () => {
      const res = await api.get<PaginatedEnvelope<User>>(`/api/users?page=${page}&limit=${limit}`);
      return res.data;
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateUserInput }) => {
      const res = await api.put<ApiEnvelope<User>>(`/api/users/${id}`, input);
      return res.data.data!;
    },
    onSuccess: () => {
      toast.success("User updated");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err, "Update failed")),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/users/${id}`);
    },
    onSuccess: () => {
      toast.success("User deleted");
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err, "Delete failed")),
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Users className="h-6 w-6" />
          Users
        </h1>
        <p className="text-sm text-[color:var(--color-muted-foreground)]">
          All registered users (paginated).
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>List</CardTitle>
          <CardDescription>
            {query.data?.pagination
              ? `${query.data.pagination.total_items} total · page ${query.data.pagination.page}/${query.data.pagination.total_pages}`
              : "Loading…"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {query.isError ? (
            <ErrorState
              error={query.error}
              title="Failed to load users"
              onRetry={() => query.refetch()}
            />
          ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--color-border)]">
                  <th className="text-left py-2 px-2 font-medium">Name</th>
                  <th className="text-left py-2 px-2 font-medium">Email</th>
                  <th className="text-left py-2 px-2 font-medium">Role</th>
                  <th className="text-left py-2 px-2 font-medium">Status</th>
                  <th className="text-left py-2 px-2 font-medium">Created</th>
                  {canManage && <th className="text-right py-2 px-2 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {query.isLoading && (
                  <tr><td colSpan={cols} className="py-6 text-center">Loading…</td></tr>
                )}
                {query.data?.data?.map((u) => (
                  <tr key={u.id} className="border-b border-[color:var(--color-border)] last:border-0">
                    <td className="py-2 px-2">{u.name}</td>
                    <td className="py-2 px-2">{u.email}</td>
                    <td className="py-2 px-2">
                      <span
                        className={cn(
                          "inline-block rounded px-1.5 py-0.5 text-xs font-medium capitalize",
                          u.role === "admin"
                            ? "bg-[color:var(--color-muted)] text-[color:var(--color-foreground)]"
                            : "text-[color:var(--color-muted-foreground)]"
                        )}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <VerifiedBadge verifiedAt={u.email_verified_at} />
                    </td>
                    <td className="py-2 px-2 text-[color:var(--color-muted-foreground)]">
                      {formatDate(u.created_at)}
                    </td>
                    {canManage && (
                      <td className="py-2 px-2 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditing(u)}
                            aria-label="Edit user"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleting(u)}
                            aria-label="Delete user"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {query.data?.data?.length === 0 && (
                  <tr><td colSpan={cols} className="py-6 text-center text-[color:var(--color-muted-foreground)]">No users</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center pt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!query.data || page >= (query.data.pagination?.total_pages ?? 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
          </>
          )}
        </CardContent>
      </Card>

      <EditUserModal
        user={editing}
        onClose={() => setEditing(null)}
        onSubmit={(input) => editing && update.mutate({ id: editing.id, input })}
        pending={update.isPending}
      />

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete user"
        description={
          deleting
            ? `Are you sure you want to delete ${deleting.name} (${deleting.email})? This action cannot be undone.`
            : undefined
        }
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(null)} disabled={del.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => deleting && del.mutate(deleting.id)}
            disabled={del.isPending}
          >
            {del.isPending ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function EditUserModal({
  user,
  onClose,
  onSubmit,
  pending,
}: {
  user: User | null;
  onClose: () => void;
  onSubmit: (input: UpdateUserInput) => void;
  pending: boolean;
}) {
  const form = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: { name: "", email: "" },
  });

  const { reset } = form;
  useEffect(() => {
    if (user) reset({ name: user.name, email: user.email });
  }, [user, reset]);

  return (
    <Modal open={!!user} onClose={onClose} title="Edit user" description="Update the user's name and email.">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="edit-name">Name</Label>
          <Input id="edit-name" {...form.register("name")} />
          {form.formState.errors.name && (
            <p className="text-xs text-red-600">{form.formState.errors.name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-email">Email</Label>
          <Input id="edit-email" type="email" {...form.register("email")} />
          {form.formState.errors.email && (
            <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
