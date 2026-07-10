"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Loader2,
  Plus,
  UserRound,
} from "lucide-react";

import { EmployeeForm } from "@/components/admin/employees/EmployeeForm";
import { EmployeeScheduleEditor } from "@/components/admin/employees/EmployeeScheduleEditor";
import { EmployeeScheduleExceptions } from "@/components/admin/employees/EmployeeScheduleExceptions";
import { Button } from "@/components/ui/button";
import { scheduleRowsToInput } from "@/lib/technicians/schedule-utils";
import type { EmployeeWithSchedule, TechnicianScheduleInput } from "@/lib/technicians/types";
import { cn } from "@/lib/utils";

export function EmployeesDashboard() {
  const router = useRouter();
  const [employees, setEmployees] = useState<EmployeeWithSchedule[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [conflictWarning, setConflictWarning] = useState("");
  const [mobileExpandedId, setMobileExpandedId] = useState<string | null>(null);

  const [draftName, setDraftName] = useState("");
  const [draftRole, setDraftRole] = useState("");
  const [draftActive, setDraftActive] = useState(true);
  const [draftSchedule, setDraftSchedule] = useState<TechnicianScheduleInput[]>([]);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedId) ?? null,
    [employees, selectedId]
  );

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/employees");
      const body = (await response.json()) as {
        employees?: EmployeeWithSchedule[];
        error?: string;
      };

      if (!response.ok) throw new Error(body.error || "Unable to load employees.");

      const nextEmployees = body.employees ?? [];
      setEmployees(nextEmployees);
      setSelectedId((current) => {
        if (current && nextEmployees.some((employee) => employee.id === current)) {
          return current;
        }
        return nextEmployees[0]?.id ?? null;
      });
    } catch (err) {
      setError((err as Error).message);
      setEmployees([]);
      setSelectedId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    if (!selectedEmployee) {
      setDraftName("");
      setDraftRole("");
      setDraftActive(true);
      setDraftSchedule([]);
      setConflictWarning("");
      return;
    }

    setDraftName(selectedEmployee.name);
    setDraftRole(selectedEmployee.role ?? "");
    setDraftActive(selectedEmployee.is_active);
    setDraftSchedule(scheduleRowsToInput(selectedEmployee.schedule));
    setConflictWarning("");
  }, [selectedEmployee]);

  async function handleAddEmployee(payload: {
    name: string;
    role: string;
    schedule: TechnicianScheduleInput[];
  }) {
    const response = await fetch("/api/admin/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = (await response.json()) as { error?: string; employee?: EmployeeWithSchedule };
    if (!response.ok) throw new Error(body.error || "Unable to add employee.");

    setShowAddForm(false);
    await loadEmployees();
    if (body.employee?.id) setSelectedId(body.employee.id);
  }

  async function saveProfile() {
    if (!selectedEmployee) return;

    setSavingProfile(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/employees/${selectedEmployee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draftName.trim(),
          role: draftRole.trim() || null,
          isActive: draftActive,
        }),
      });

      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to save employee.");

      await loadEmployees();
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveSchedule() {
    if (!selectedEmployee) return;

    setSavingSchedule(true);
    setError("");
    setConflictWarning("");

    try {
      const response = await fetch(`/api/admin/employees/${selectedEmployee.id}/schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule: draftSchedule }),
      });

      const body = (await response.json()) as {
        error?: string;
        futureBookingConflicts?: number;
      };

      if (!response.ok) throw new Error(body.error || "Unable to save schedule.");

      if (body.futureBookingConflicts && body.futureBookingConflicts > 0) {
        setConflictWarning(
          `${selectedEmployee.name} has ${body.futureBookingConflicts} future booking(s) outside the updated schedule. Review the agenda.`
        );
      }

      await loadEmployees();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingSchedule(false);
    }
  }

  async function deactivateEmployee() {
    if (!selectedEmployee) return;
    if (!window.confirm(`Deactivate ${selectedEmployee.name}? They will be hidden from booking.`)) {
      return;
    }

    setSavingProfile(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/employees/${selectedEmployee.id}`, {
        method: "DELETE",
      });

      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to deactivate employee.");

      await loadEmployees();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function deleteEmployee() {
    if (!selectedEmployee) return;
    if (
      !window.confirm(
        `Permanently delete ${selectedEmployee.name}? Their past appointments will be kept but unassigned. This cannot be undone.`
      )
    ) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/employees/${selectedEmployee.id}?hard=true`,
        { method: "DELETE" }
      );

      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to delete employee.");

      setSelectedId(null);
      await loadEmployees();
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  async function moveEmployee(id: string, direction: "up" | "down") {
    const index = employees.findIndex((employee) => employee.id === id);
    if (index < 0) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= employees.length) return;

    const reordered = [...employees];
    const [item] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, item);

    setEmployees(reordered);

    const response = await fetch("/api/admin/employees/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: reordered.map((employee) => employee.id) }),
    });

    if (!response.ok) {
      await loadEmployees();
    }
  }

  if (loading) {
    return (
      <div className="container flex min-h-[40vh] items-center justify-center py-16">
        <Loader2 className="size-8 animate-spin text-ink-muted" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8 md:py-10">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
            Team
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold text-ink md:text-5xl">
            Employees
          </h1>
          <p className="mt-2 max-w-2xl text-ink-muted">
            Manage your team, weekly schedules, and who appears in online booking.
          </p>
        </div>
        <Button onClick={() => setShowAddForm((value) => !value)} className="w-full sm:w-auto">
          <Plus className="size-4" />
          Add Employee
        </Button>
      </header>

      {error && (
        <p className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {showAddForm && (
        <section className="mb-8 rounded-3xl bg-offwhite p-6 ring-1 ring-ink/5 md:p-8">
          <h2 className="text-xl font-semibold text-ink">New employee</h2>
          <div className="mt-6">
            <EmployeeForm
              onSubmit={handleAddEmployee}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        </section>
      )}

      {employees.length === 0 ? (
        <section className="rounded-3xl bg-offwhite p-8 text-center ring-1 ring-ink/5">
          <UserRound className="mx-auto size-10 text-ink-muted" />
          <p className="mt-4 text-lg font-semibold text-ink">No employees yet</p>
          <p className="mt-2 text-ink-muted">Add your first team member to set up schedules.</p>
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(16rem,22rem)_1fr]">
          <section className="hidden rounded-3xl bg-offwhite p-4 ring-1 ring-ink/5 lg:block">
            <p className="px-2 text-sm font-semibold text-ink">Team</p>
            <ul className="mt-3 space-y-2">
              {employees.map((employee, index) => {
                const active = employee.id === selectedId;
                return (
                  <li key={employee.id}>
                    <div
                      className={cn(
                        "flex items-center gap-2 rounded-2xl px-2 py-1",
                        active && "bg-background"
                      )}
                    >
                      <div className="flex flex-col">
                        <button
                          type="button"
                          aria-label={`Move ${employee.name} up`}
                          disabled={index === 0}
                          onClick={() => moveEmployee(employee.id, "up")}
                          className="rounded p-1 text-ink-muted hover:bg-secondary disabled:opacity-30"
                        >
                          <ChevronUp className="size-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Move ${employee.name} down`}
                          disabled={index === employees.length - 1}
                          onClick={() => moveEmployee(employee.id, "down")}
                          className="rounded p-1 text-ink-muted hover:bg-secondary disabled:opacity-30"
                        >
                          <ChevronDown className="size-4" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedId(employee.id)}
                        className="flex min-h-12 flex-1 items-center gap-3 rounded-2xl px-3 py-3 text-left"
                      >
                        <GripVertical className="size-4 shrink-0 text-ink-muted" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-ink">
                            {employee.name}
                          </span>
                          <span className="block truncate text-sm text-ink-muted">
                            {employee.role || "Team member"}
                          </span>
                        </span>
                        {!employee.is_active && (
                          <span className="rounded-full bg-secondary px-2 py-1 text-xs font-semibold text-ink-muted">
                            Inactive
                          </span>
                        )}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="space-y-4 lg:hidden">
            {employees.map((employee, index) => {
              const expanded = mobileExpandedId === employee.id;
              return (
                <article
                  key={employee.id}
                  className="rounded-3xl bg-offwhite ring-1 ring-ink/5"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setMobileExpandedId(expanded ? null : employee.id)
                    }
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                  >
                    <span>
                      <span className="block font-semibold text-ink">{employee.name}</span>
                      <span className="block text-sm text-ink-muted">
                        {employee.role || "Team member"}
                        {!employee.is_active ? " · Inactive" : ""}
                      </span>
                    </span>
                    <ChevronDown
                      className={cn(
                        "size-5 text-ink-muted transition-transform",
                        expanded && "rotate-180"
                      )}
                    />
                  </button>

                  {expanded && (
                    <div className="border-t border-ink/8 px-5 pb-5 pt-4">
                      <MobileEmployeeActions
                        index={index}
                        total={employees.length}
                        onMoveUp={() => moveEmployee(employee.id, "up")}
                        onMoveDown={() => moveEmployee(employee.id, "down")}
                        onSelect={() => {
                          setSelectedId(employee.id);
                          setMobileExpandedId(employee.id);
                        }}
                      />
                      {selectedId === employee.id && selectedEmployee ? (
                        <EmployeeEditorPanel
                          employeeId={employee.id}
                          draftName={draftName}
                          draftRole={draftRole}
                          draftActive={draftActive}
                          draftSchedule={draftSchedule}
                          conflictWarning={conflictWarning}
                          savingProfile={savingProfile}
                          savingSchedule={savingSchedule}
                          onNameChange={setDraftName}
                          onRoleChange={setDraftRole}
                          onActiveChange={setDraftActive}
                          onScheduleChange={setDraftSchedule}
                          onSaveProfile={saveProfile}
                          onSaveSchedule={saveSchedule}
                          onDeactivate={deactivateEmployee}
                          onDelete={deleteEmployee}
                          deleting={deleting}
                        />
                      ) : (
                        <Button
                          variant="secondary"
                          className="mt-3 w-full"
                          onClick={() => {
                            setSelectedId(employee.id);
                          }}
                        >
                          Edit schedule
                        </Button>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </section>

          <section className="hidden rounded-3xl bg-offwhite p-6 ring-1 ring-ink/5 lg:block md:p-8">
            {selectedEmployee ? (
              <EmployeeEditorPanel
                employeeId={selectedEmployee.id}
                draftName={draftName}
                draftRole={draftRole}
                draftActive={draftActive}
                draftSchedule={draftSchedule}
                conflictWarning={conflictWarning}
                savingProfile={savingProfile}
                savingSchedule={savingSchedule}
                onNameChange={setDraftName}
                onRoleChange={setDraftRole}
                onActiveChange={setDraftActive}
                onScheduleChange={setDraftSchedule}
                onSaveProfile={saveProfile}
                onSaveSchedule={saveSchedule}
                onDeactivate={deactivateEmployee}
                onDelete={deleteEmployee}
                deleting={deleting}
              />
            ) : (
              <p className="text-ink-muted">Select an employee to edit their schedule.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function MobileEmployeeActions({
  index,
  total,
  onMoveUp,
  onMoveDown,
  onSelect,
}: {
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSelect: () => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <Button type="button" variant="secondary" size="sm" disabled={index === 0} onClick={onMoveUp}>
        Move up
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={index === total - 1}
        onClick={onMoveDown}
      >
        Move down
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={onSelect}>
        Edit details
      </Button>
    </div>
  );
}

function EmployeeEditorPanel({
  employeeId,
  draftName,
  draftRole,
  draftActive,
  draftSchedule,
  conflictWarning,
  savingProfile,
  savingSchedule,
  deleting,
  onNameChange,
  onRoleChange,
  onActiveChange,
  onScheduleChange,
  onSaveProfile,
  onSaveSchedule,
  onDeactivate,
  onDelete,
}: {
  employeeId: string;
  draftName: string;
  draftRole: string;
  draftActive: boolean;
  draftSchedule: TechnicianScheduleInput[];
  conflictWarning: string;
  savingProfile: boolean;
  savingSchedule: boolean;
  deleting: boolean;
  onNameChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  onActiveChange: (value: boolean) => void;
  onScheduleChange: (value: TechnicianScheduleInput[]) => void;
  onSaveProfile: () => void;
  onSaveSchedule: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-2 block font-medium text-ink">Name</span>
          <input
            value={draftName}
            onChange={(event) => onNameChange(event.target.value)}
            className="h-11 w-full rounded-xl border border-ink/15 bg-background px-4 text-ink"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-2 block font-medium text-ink">Role</span>
          <input
            value={draftRole}
            onChange={(event) => onRoleChange(event.target.value)}
            className="h-11 w-full rounded-xl border border-ink/15 bg-background px-4 text-ink"
          />
        </label>
      </div>

      <label className="inline-flex min-h-11 items-center gap-3 text-sm font-medium text-ink">
        <input
          type="checkbox"
          checked={draftActive}
          onChange={(event) => onActiveChange(event.target.checked)}
          className="size-4 rounded border-ink/20"
        />
        Active employee (visible in booking and agenda)
      </label>

      <div className="flex flex-wrap gap-3">
        <Button onClick={onSaveProfile} disabled={savingProfile || deleting || !draftName.trim()}>
          {savingProfile ? "Saving…" : "Save profile"}
        </Button>
        <Button variant="outline" onClick={onDeactivate} disabled={savingProfile || deleting}>
          Deactivate
        </Button>
        <Button
          variant="outline"
          onClick={onDelete}
          disabled={savingProfile || deleting}
          className="border-rose-200 text-rose-700 hover:bg-rose-50"
        >
          {deleting ? "Deleting…" : "Delete"}
        </Button>
      </div>

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-ink">Weekly schedule</h2>
          <Button onClick={onSaveSchedule} disabled={savingSchedule}>
            {savingSchedule ? "Saving…" : "Save schedule"}
          </Button>
        </div>

        <EmployeeScheduleEditor
          schedule={draftSchedule}
          onChange={onScheduleChange}
          disabled={savingSchedule}
        />

        {conflictWarning && (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {conflictWarning}
          </p>
        )}
      </div>

      <EmployeeScheduleExceptions employeeId={employeeId} disabled={savingSchedule} />
    </div>
  );
}
