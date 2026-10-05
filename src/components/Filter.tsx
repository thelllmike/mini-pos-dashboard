import Link from "next/link";

/** A plain GET form: the filter lives in the URL, so a filtered list can be shared. */
export function SearchBox({ action, q, placeholder, children }: {
  action: string; q: string; placeholder: string; children?: React.ReactNode;
}) {
  return (
    <form action={action} className="mb-4 flex flex-wrap items-center gap-2">
      <input
        name="q" defaultValue={q} placeholder={placeholder} type="search"
        className="min-w-0 flex-1 rounded-xl bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue"
      />
      {children}
      <button type="submit" className="rounded-xl bg-blue px-4 py-2.5 text-sm font-semibold text-white">
        Search
      </button>
      {q && <Link href={action} className="text-sm text-blue">Clear</Link>}
    </form>
  );
}

export function Select({ name, value, options }: {
  name: string; value: string; options: { value: string; label: string }[];
}) {
  return (
    <select
      name={name} defaultValue={value}
      className="rounded-xl bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
