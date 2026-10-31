export const PASSWORD_REQUIREMENTS = [
  {
    id: "lowercase",
    label: "One lowercase letter",
    test: (password: string) => /[a-z]/.test(password),
  },
  {
    id: "uppercase",
    label: "One uppercase letter",
    test: (password: string) => /[A-Z]/.test(password),
  },
  {
    id: "special",
    label: "One special character",
    test: (password: string) => /[^A-Za-z0-9]/.test(password),
  },
  {
    id: "number",
    label: "One number",
    test: (password: string) => /[0-9]/.test(password),
  },
  {
    id: "length",
    label: "8 characters minimum",
    test: (password: string) => password.length > 8,
  },
] as const;

export function getPasswordRequirementStatus(password: string) {
  return PASSWORD_REQUIREMENTS.map((requirement) => ({
    ...requirement,
    met: requirement.test(password),
  }));
}
