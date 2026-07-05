type Metric = {
  label: string;
  value: string;
};

type PlaceholderPageProps = {
  title: string;
  description: string;
  metrics?: Metric[];
  items?: string[];
};

export function PlaceholderPage({
  title,
  description,
  metrics = [],
  items = []
}: PlaceholderPageProps) {
  return (
    <div className="space-y-5 p-5">
      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
      </section>

      {metrics.length > 0 ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <div className="rounded-lg border border-line bg-white p-4" key={metric.label}>
              <div className="text-xs text-slate-500">{metric.label}</div>
              <div className="mt-2 text-2xl font-semibold">{metric.value}</div>
            </div>
          ))}
        </section>
      ) : null}

      {items.length > 0 ? (
        <section className="rounded-lg border border-line bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold">MVP范围</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {items.map((item) => (
              <div className="rounded-md bg-mist p-3 text-sm text-slate-700" key={item}>
                {item}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

