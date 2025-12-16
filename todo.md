# RadioTocai - TODO

## Funcionalidades Implementadas
- [x] Projeto importado da plataforma anterior
- [x] Arquivos copiados para estrutura Manus
- [x] Dependências instaladas (Firebase, PeerJS, Google GenAI)
- [x] Erros de TypeScript corrigidos
- [x] Servidor de desenvolvimento rodando
- [x] Preview funcionando

## Próximas Tarefas
- [ ] Ajustes de design/cores (aguardando instruções do usuário)
- [ ] Novas funcionalidades (aguardando instruções do usuário)
- [ ] Publicação final

## Bugs Reportados
- [x] Corrigir layout quebrado - CSS não está sendo aplicado corretamente nos botões e elementos (CORRIGIDO - adicionado @import tailwindcss)

## Nova Funcionalidade
- [x] Implementar sincronização de áudio por tempo do servidor (todos ouvem a mesma música no mesmo momento) - CONCLUÍDO
- [x] Testes de broadcast sync criados e passando (6 testes)

## Bugs a Corrigir
- [x] Sincronização não persiste ao atualizar página - cada refresh escolhe música aleatória diferente (CORRIGIDO)
- [x] Música fica pulando devido a re-sincronização excessiva - não toca inteira (CORRIGIDO - sincroniza só no play)
- [x] Música ainda muda antes de terminar - precisa investigar causa raiz (CORRIGIDO - AUDIO LOGIC só muda se isPlaying=true)
- [x] Bug persiste: música toca só 10 segundos e muda - investigar causa raiz mais profunda (CORRIGIDO - broadcast sync ignora quando isPlaying=true)
- [x] Bug CRÍTICO: música ainda não toca inteira - análise profunda necessária (CORRIGIDO - removida sincronização de tempo no togglePlay)
- [x] LIMPEZA GERAL: Simplificar lógica de sincronização - código está confuso com múltiplas coisas controlando a música (CORRIGIDO - AutoDJ só roda para admin, ouvintes só leem do Firebase)
- [x] SINCRONIZAÇÃO DEFINITIVA: Ouvinte deve ler do Firebase e tocar a mesma música no mesmo segundo que o admin (IMPLEMENTADO - sincroniza automaticamente ao carregar página)
- [x] BUG: Música pulando para o final no player do admin - não toca lisa, pula pro final e depois toca (CORRIGIDO - relógio observa o admin e salva no Firebase a cada 5s)
- [x] BUG: Ouvinte fica fixo em uma música só - volta ao início em vez de acompanhar o progresso do admin (CORRIGIDO - ouvinte sincroniza ao clicar play e quando música termina)
- [x] BUG CRÍTICO: Admin não está tocando liso - música travando (CORRIGIDO - refs para evitar re-renders, lógica de áudio isolada)
- [x] REVERTER: Remover lógica de sincronização que está causando problemas no player do admin (FEITO - player simplificado)
- [x] DOIS PLAYERS INDEPENDENTES: Admin toca e salva no Firebase, Home lê do Firebase e toca separadamente
- [x] BACKGROUND PLAY: Usar Media Session API para tocar em segundo plano nos celulares
- [x] AUTO-RECONEXÃO: Tentar reconectar automaticamente quando perder sinal de internet
- [x] BUG: Home travada em música antiga do Firebase - não atualiza com o que o admin está tocando (CORRIGIDO - salvamento imediato + busca sempre do Firebase)
