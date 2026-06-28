"use client";

import { useState } from "react";

import { EmployeeScheduleEditor } from "@/components/admin/employees/EmployeeScheduleEditor";
import { Button } from "@/components/ui/button";
import { applySalonHoursToSchedule } from "@/lib/technicians/schedule-utils";
import type { TechnicianScheduleInput } from "@/lib/technicians/types";

interface EmployeeFormProps {
  onSubmit: (payload: {
    name: string;
    role: string;
    schedule: TechnicianScheduleInput[];
  }) => Promise<void>;
  onCancel: () => void;
}

export function EmployeeForm({ onSubmit, onCancel }: EmployeeFormProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [schedule, setSchedule] = useState(applySalonHoursToSchedule());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await onSubmit({
        name: name.trim(),
        role: role.trim(),
        schedule,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-2 block font-medium text-ink">Name</span>
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-11 w-full rounded-xl border border-ink/15 bg-offwhite px-4 text-ink"
            placeholder="Maria Santos"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-2 block font-medium text-ink">Role</span>
          <input
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="h-11 w-full rounded-xl border border-ink/15 bg-offwhite px-4 text-ink"
            placeholder="Senior Nail Technician"
          />
        </label>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-ink">Weekly schedule</p>
        <EmployeeScheduleEditor schedule={schedule} onChange={setSchedule} disabled={saving} />
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={saving || !name.trim()}>
          {saving ? "Adding…" : "Add employee"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
