/** Column id for unassigned / "any employee" appointments in the admin agenda. */
export const ANY_EMPLOYEE_ID = "any-employee";

export const ANY_EMPLOYEE_LABEL = "Any Employee";

export function isAnyEmployeeColumnId(id: string): boolean {
  return id === ANY_EMPLOYEE_ID;
}
