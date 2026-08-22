import { Card, CardContent } from "@/components/ui/card";
import { productFeatures } from "@/lib/content/plan";

export function FeaturesSection() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16 sm:px-12 sm:py-24 lg:px-16">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-2xl font-bold text-ry-ink sm:text-3xl">
          Tudo o que o seu negócio precisa para organizar a agenda
        </h2>
        <p className="mt-3 text-base text-ry-ink-soft sm:text-lg">
          Do agendamento ao atendimento pelo WhatsApp, a Replyon reúne as ferramentas essenciais
          para negócios de serviço.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {productFeatures.map(({ icon: Icon, title, description }) => (
          <Card key={title} className="border-ry-blue-100">
            <CardContent className="flex flex-col items-start gap-3 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-ry-blue-50 text-ry-blue-700">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-semibold text-ry-ink">{title}</h3>
              <p className="text-sm text-ry-ink-soft">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
