import Link from "next/link";
import { Busca } from "@/components/Busca";
import { Container } from "@/components/ui";

export default function NaoEncontrado() {
  return (
    <Container className="py-20">
      <h1 className="display text-4xl font-extrabold sm:text-5xl">Página não encontrada</h1>
      <p className="mt-3 max-w-xl text-lg text-ink-2">O endereço pode estar errado ou a pessoa pode ter deixado o mandato. Busque pelo nome:</p>
      <div className="mt-6 max-w-xl">
        <Busca grande />
      </div>
      <Link href="/" className="link mt-6 inline-block">
        Voltar para o início
      </Link>
    </Container>
  );
}
