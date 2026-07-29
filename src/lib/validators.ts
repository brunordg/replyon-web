/** Validates a CPF, including check digits. Accepts masked or unmasked input. */
export function isValidCPF(value: string): boolean {
  const cpf = value.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
  let checkDigit1 = (sum * 10) % 11;
  if (checkDigit1 === 10) checkDigit1 = 0;
  if (checkDigit1 !== Number(cpf[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
  let checkDigit2 = (sum * 10) % 11;
  if (checkDigit2 === 10) checkDigit2 = 0;
  return checkDigit2 === Number(cpf[10]);
}

/** Validates a CNPJ, including check digits. Accepts masked or unmasked input. */
export function isValidCNPJ(value: string): boolean {
  const cnpj = value.replace(/\D/g, "");
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  const calcDigit = (base: string): number => {
    const weights =
      base.length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = base.split("").reduce((acc, digit, i) => acc + Number(digit) * weights[i], 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const digit1 = calcDigit(cnpj.slice(0, 12));
  const digit2 = calcDigit(cnpj.slice(0, 12) + digit1);
  return digit1 === Number(cnpj[12]) && digit2 === Number(cnpj[13]);
}

/** Validates a CPF (11 digits) or CNPJ (14 digits), picking the check by length. */
export function isValidDocument(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) return isValidCPF(digits);
  if (digits.length === 14) return isValidCNPJ(digits);
  return false;
}

/** Validates a Brazilian cell phone: 11 digits, valid DDD, "9" as the first digit of the local number. */
export function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  const ddd = Number(digits.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;
  return digits[2] === "9";
}
