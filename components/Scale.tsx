/**
 * La escala 1–5: el isotipo de la marca y la nota de cada lead.
 * Los módulos llenos van en tinta; el quinto, si está lleno, en acento.
 */
export function Scale({
  score = 5,
  size = 10,
  gap,
  label,
}: {
  score?: number;
  size?: number;
  gap?: number;
  label?: string;
}) {
  const g = gap ?? Math.max(1, Math.round(size / 4.5));
  return (
    <span
      className="scale"
      style={{ gap: g }}
      {...(label === ""
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": label ?? `Nota ${score} de 5` })}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={`${i < score ? "on" : ""} ${i === 4 ? "top" : ""}`}
          style={{ width: size, height: size }}
        />
      ))}
    </span>
  );
}
