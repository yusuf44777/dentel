type BrandLogoProps = {
  textClassName?: string;
  iconClassName?: string;
};

export default function BrandLogo({
  textClassName = "text-slate-900",
  iconClassName = "w-9 h-9",
}: BrandLogoProps) {
  return (
    <a href="#" className="inline-flex items-center gap-2.5">
      <img src="/logo-mark.svg" alt="dentel logo" className={iconClassName} />
      <span className={`text-xl font-black tracking-tight ${textClassName}`}>
        dentel
      </span>
    </a>
  );
}
