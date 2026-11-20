/** What the contact dialog holds: the two boxes as typed. */
export interface ContactForm {
  email: string;
  phone: string;
}

/** What the server accepts (`PATCH /drivers/{id}/contact`): a field left out stays as it is. */
export interface ContactChanges {
  email?: string;
  phone?: string;
}

/** The digits of a phone as typed or stored, so "(708) 855-9218" and "+17088559218" compare equal. */
const digits = (phone: string): string => phone.replace(/\D/g, "");

/** A US phone's ten digits: a leading country code `1` is dropped. */
const tenDigits = (phone: string): string => {
  const all = digits(phone);
  return all.length === 11 && all.startsWith("1") ? all.slice(1) : all;
};

/**
 * Only the fields the admin really changed. Leaving the email out when it is the same matters: the server refuses an email
 * change for a driver who has a login, so sending the unchanged email back would block a phone-only edit. The server
 * checks and normalises the values; this only decides what to send, so a value typed the same way in another style (spaces,
 * capitals, `+1`) is not a change.
 */
export function contactChanges(
  current: ContactForm,
  typed: ContactForm,
): ContactChanges {
  const changes: ContactChanges = {};
  const email = typed.email.trim();
  if (email.toLowerCase() !== current.email.trim().toLowerCase()) {
    changes.email = email;
  }
  const phone = typed.phone.trim();
  if (tenDigits(phone) !== tenDigits(current.phone)) {
    changes.phone = phone;
  }
  return changes;
}
