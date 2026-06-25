type HeaderProps = {
  title: string;
  description?: string;
  children?: React.ReactNode;
  border?: boolean;
};

export function Header({ title, description, children, border }: HeaderProps) {
  return (
    <header
      className={`flex items-center ${border ? "border-border border-b pb-4" : ""}`}
    >
      <div className="space-y-2">
        <h1 className="font-bold">{title}</h1>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      <div className="ml-auto space-x-2">{children}</div>
    </header>
  );
}
