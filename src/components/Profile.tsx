import { useEffect, useState } from "react";
import { useApp } from "../lib/store";
import { BRANCHES, CREDENTIALS, ROLE_MAP, ageOf, fmtDate, fullName } from "../lib/data";
import { Avatar, Btn, Drawer, Field, KeyVal, Pill, TextInput } from "./ui";
import { I } from "./icons";

function SecretField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label}>
      <div className="relative">
        <input
          type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="w-full bg-white border border-line rounded-lg px-3 py-2 pr-10 text-[16px] sm:text-sm text-ink placeholder:text-ink-faint/70 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-shadow"
        />
        <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-brand-700 transition-colors" aria-label="Toggle visibility">
          <I name={show ? "eye-off" : "eye"} className="w-4 h-4" />
        </button>
      </div>
    </Field>
  );
}

export function ProfileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { s, updateProfile, changePassword, updatePatientContact } = useApp();
  const role = s.session?.role ?? "admin";
  const meta = ROLE_MAP[role];
  const override = s.profiles[role] ?? {};
  const isPatient = role === "patient";
  const me = s.patients.find((p) => p.id === "p1");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [curPass, setCurPass] = useState("");
  const [newPass, setNewPass] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(override.name ?? meta.name);
    setPhone(isPatient ? me?.phone ?? "" : override.phone ?? "");
    setEmail(isPatient ? me?.email ?? "" : override.email ?? "");
    setAddress(me?.address ?? "");
    setCurPass(""); setNewPass("");
  }, [open, role]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const creds = CREDENTIALS[role];
  const branch = BRANCHES.find((b) => b.id === s.branchId);

  const save = () => {
    if (isPatient) {
      if (me) updatePatientContact(me.id, { phone: phone.trim(), email: email.trim(), address: address.trim() });
    } else {
      updateProfile(role, { name: name.trim() || meta.name, phone: phone.trim(), email: email.trim() });
    }
    if (newPass) {
      const ok = changePassword(role, curPass, newPass);
      if (!ok) return;
    }
    onClose();
  };

  return (
    <Drawer open={open} onClose={onClose} width={430}>
      {/* header */}
      <div className="sticky top-0 z-10 bg-pine-900 pine-tex text-white px-5 py-5">
        <div className="flex items-start gap-3.5">
          <span className="relative">
            <Avatar name={isPatient && me ? fullName(me) : (override.name ?? meta.name)} color={isPatient ? me?.color ?? meta.color : meta.color} size={56} />
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-brand-400 border-[3px] border-pine-900 pulse-live" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="micro text-brand-400">{isPatient ? "Patient account" : meta.label}</p>
            <h2 className="font-display font-extrabold text-[19px] leading-tight truncate">
              {isPatient && me ? fullName(me) : (override.name ?? meta.name)}
            </h2>
            <p className="text-[11.5px] text-pine-100/70 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span className="font-mono">{isPatient ? me?.code : creds.username}</span>
              <span className="opacity-50">·</span>
              <span>{branch?.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-pine-100/70 hover:text-white hover:bg-white/10 transition-colors" aria-label="Close">
            <I name="x" className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          <Pill tone="pine">{meta.label}</Pill>
          <Pill tone="green">Active session</Pill>
          {isPatient && me && <Pill tone="red">Blood {me.blood}</Pill>}
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* identity */}
        {!isPatient && (
          <section className="bg-card border border-line rounded-xl p-4 space-y-3">
            <h3 className="micro text-ink-soft flex items-center gap-1.5"><I name="user" className="w-3.5 h-3.5" /> Identity</h3>
            <Field label="Full name"><TextInput value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Role"><TextInput value={meta.label} disabled className="opacity-60" /></Field>
              <Field label="Login ID"><TextInput value={creds.username} disabled className="opacity-60 font-mono" /></Field>
            </div>
          </section>
        )}

        {isPatient && me && (
          <section className="bg-card border border-line rounded-xl p-4">
            <h3 className="micro text-ink-soft flex items-center gap-1.5 mb-1"><I name="heart" className="w-3.5 h-3.5" /> Medical summary</h3>
            <KeyVal k="Date of birth" v={`${fmtDate(me.dob)} · ${ageOf(me.dob)} yrs`} />
            <KeyVal k="Gender" v={me.gender} />
            <KeyVal k="Allergies" v={me.allergies.length ? me.allergies.join(", ") : "None recorded"} />
            <KeyVal k="Conditions" v={me.conditions.length ? me.conditions.join(", ") : "None recorded"} />
            <KeyVal k="Insurance" v={s.insurers.find((i) => i.id === me.insuranceProviderId)?.name ?? "Self-pay"} />
          </section>
        )}

        {/* contact */}
        <section className="bg-card border border-line rounded-xl p-4 space-y-3">
          <h3 className="micro text-ink-soft flex items-center gap-1.5"><I name="phone" className="w-3.5 h-3.5" /> Contact details</h3>
          <Field label="Phone"><TextInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98xxx xxxxx" /></Field>
          <Field label="Email"><TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@mail.com" /></Field>
          {isPatient && <Field label="Address"><TextInput value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, locality, city" /></Field>}
        </section>

        {/* security */}
        <section className="bg-card border border-line rounded-xl p-4 space-y-3">
          <h3 className="micro text-ink-soft flex items-center gap-1.5"><I name="lock" className="w-3.5 h-3.5" /> Password</h3>
          <SecretField label="Current password" value={curPass} onChange={setCurPass} placeholder="Required to change" />
          <SecretField label="New password" value={newPass} onChange={setNewPass} placeholder="Leave blank to keep current" />
          <p className="text-[11px] text-ink-faint flex items-start gap-1.5">
            <I name="shield" className="w-3.5 h-3.5 shrink-0 mt-px" />
            Password changes are audit-logged and apply from your next sign-in. Minimum 6 characters.
          </p>
        </section>

        <div className="flex gap-2 pb-2">
          <Btn variant="outline" className="flex-1" onClick={onClose}>Cancel</Btn>
          <Btn icon="check" className="flex-1" onClick={save}>Save changes</Btn>
        </div>
      </div>
    </Drawer>
  );
}
