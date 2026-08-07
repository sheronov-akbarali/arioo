import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function WorkZoneCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <span className="mb-3 flex size-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <Icon className="size-5" />
        </span>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{description}</CardContent>
    </Card>
  );
}
