import { z } from 'zod';
import { productAttributesSchema } from './productAttributes.js';

export const recommendationSchema = z.object({
  lojaId: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
  tipo: z.enum(['celular', 'tablet']),
  orcamento: z.number().positive().max(100000),
  uso: z.enum(['dia-a-dia', 'trabalho', 'jogos', 'fotos', 'estudos', 'redes-sociais', 'nao-sei']),
  prioridade: z.enum(['equilibrado', 'economia', 'bateria', 'armazenamento']).optional(),
  ramMinima: z.number().int().positive().max(128).optional(),
  armazenamentoMinimo: z.number().int().positive().max(8192).optional(),
}).strict();
export type Needs = z.infer<typeof recommendationSchema>;
export type Candidate = {
  id: string; lojaId: string; nome: string; categoria: string; preco: number;
  estoque: number; ativo: boolean; atributosTecnicos: unknown;
};

export function rankProducts<T extends Candidate>(products: T[], needs: Needs) {
  return products.flatMap(product => {
    if (!product.ativo || product.lojaId !== needs.lojaId || product.estoque <= 0
      || !Number.isFinite(product.preco) || product.preco < 0
      || Math.round(product.preco * 100) > Math.floor(needs.orcamento * 100 + 0.000001)) return [];
    const parsed = productAttributesSchema.safeParse(product.atributosTecnicos);
    const attributes = parsed.success ? parsed.data : {};
    const type = attributes.tipo || ({ Celulares: 'celular', Tablets: 'tablet' } as Record<string, string>)[product.categoria];
    if (type !== needs.tipo) return [];
    const verified = attributes.verificado === true;
    if (needs.ramMinima && (!verified || !attributes.ramGB || attributes.ramGB < needs.ramMinima)) return [];
    if (needs.armazenamentoMinimo && (!verified || !attributes.armazenamentoGB || attributes.armazenamentoGB < needs.armazenamentoMinimo)) return [];
    const reasons = ['Dentro do orçamento informado.', 'Disponível no catálogo da loja.'];
    let score = 0;
    // Only confirmed facts earn preference points. Missing data is never inferred.
    if (verified && attributes.armazenamentoGB && ['trabalho', 'estudos', 'fotos'].includes(needs.uso)) {
      score += Math.min(attributes.armazenamentoGB, 512) / 64;
      reasons.push(`${attributes.armazenamentoGB} GB de armazenamento conferidos pela loja.`);
    }
    if (verified && attributes.ramGB && needs.uso === 'jogos') {
      score += Math.min(attributes.ramGB, 16);
      reasons.push(`${attributes.ramGB} GB de RAM conferidos pela loja. Isso não garante desempenho em um jogo específico.`);
    }
    if (needs.uso === 'fotos') reasons.push('O armazenamento ajuda a guardar fotos; o catálogo não permite comparar a qualidade das câmeras.');
    if (needs.uso === 'estudos') reasons.push('Compare o espaço para materiais de estudo; confirme a compatibilidade dos aplicativos que utiliza.');
    if (needs.uso === 'redes-sociais') reasons.push('Opção para comparar dentro do seu orçamento; confirme os requisitos dos aplicativos que utiliza.');
    if (needs.prioridade === 'bateria' && verified && attributes.bateriaMah) {
      score += Math.min(attributes.bateriaMah, 20000) / 500;
      reasons.push(`${attributes.bateriaMah} mAh de capacidade de bateria conferidos. A duração depende do uso.`);
    }
    if (needs.prioridade === 'armazenamento' && verified && attributes.armazenamentoGB) {
      score += Math.min(attributes.armazenamentoGB, 1024) / 32;
      if (!['trabalho', 'estudos', 'fotos'].includes(needs.uso)) reasons.push(`${attributes.armazenamentoGB} GB de armazenamento conferidos pela loja.`);
    }
    if (needs.prioridade === 'bateria' && (!verified || !attributes.bateriaMah)) reasons.push('Capacidade de bateria não conferida; não foi usada para favorecer este aparelho.');
    if (needs.ramMinima) reasons.push(`Atende à RAM mínima de ${needs.ramMinima} GB.`);
    if (needs.armazenamentoMinimo) reasons.push(`Atende ao armazenamento mínimo de ${needs.armazenamentoMinimo} GB.`);
    return [{ produto: product, motivos: reasons, pontuacao: score,
      fonte: verified ? attributes.fonte : null,
      observacao: verified ? 'Confira a fonte e a versão do aparelho antes de decidir.' : 'Características técnicas ainda não conferidas; não avaliamos desempenho.' }];
  }).sort((a, b) => (needs.prioridade === 'economia' ? a.produto.preco - b.produto.preco : b.pontuacao - a.pontuacao) || a.produto.preco - b.produto.preco || a.produto.id.localeCompare(b.produto.id)).slice(0, 3);
}
