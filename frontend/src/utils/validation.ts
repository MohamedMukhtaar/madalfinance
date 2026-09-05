export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_RE = /^[+0-9 ()-]{7,20}$/;

export function isValidEmail(value?: string | null) {
  const v = String(value ?? "").trim();
  return EMAIL_RE.test(v);
}

export function isValidPhone(value?: string | null) {
  const v = String(value ?? "").trim();
  return PHONE_RE.test(v);
}

export function emailRules(required = false) {
  return {
    required: required ? "Email is required" : false,
    validate: (value: string) => {
      const v = String(value ?? "").trim();
      if (!v) return required ? "Email is required" : true;
      return isValidEmail(v) || "Enter a valid email address";
    },
  };
}

export function phoneRules(required = false) {
  return {
    required: required ? "Phone is required" : false,
    validate: (value: string) => {
      const v = String(value ?? "").trim();
      if (!v) return required ? "Phone is required" : true;
      return isValidPhone(v) || "Enter a valid phone number";
    },
  };
}

export function rentalPeriodLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function monthDateBounds(year: number, month: number) {
  const mm = String(month).padStart(2, "0");
  const last = new Date(year, month, 0).getDate();
  return {
    fromDate: `${year}-${mm}-01`,
    toDate: `${year}-${mm}-${String(last).padStart(2, "0")}`,
  };
}
