# RadioTocai - TODO

## Funcionalidades Implementadas
- [x] Projeto importado da plataforma anterior
- [x] Arquivos copiados para estrutura Manus
- [x] Dependências instaladas (Firebase, PeerJS, Google GenAI)
- [x] Erros de TypeScript corrigidos
- [x] Servidor de desenvolvimento rodando
- [x] Preview funcionando

## Próximas Tarefas
- [x] SINCRONIZAÇÃO: Home deve replicar exatamente o que o admin está tocando (AutoDJ ou Ao Vivo)
- [x] Media Session API: Tocar em segundo plano no celular com controles na tela de bloqueio
- [x] Auto-reconexão: Verificar conexão e reconectar automaticamente quando perder sinal
- [x] Contador de ouvintes: Mostrar quantas pessoas estão ouvindo ao vivo
- [ ] Ajustes de design/cores (aguardando instruções do usuário)
- [ ] Novas funcionalidades (aguardando instruções do usuário)
- [ ] Publicação final

## Bugs Reportados
- [x] Corrigir layout quebrado - CSS não está sendo aplicado corretamente nos botões e elementos (CORRIGIDO - adicionado @import tailwindcss)

## Próxima Tarefa
- [x] Botão "Ativar Rádio Automática" no Admin: Calcula música do AutoDJ e salva no Firebase para tocar 24/7

## Bugs Reportados
- [ ] BUG: Botão play da home não funciona - precisa do admin aberto para ter broadcast ativo
- [x] BUG: Botão play da home não toca quando rádio automática está ativada - muda título mas não reproduz áudio (CORRIGIDO - botão agora busca do Firebase quando não tem música)
