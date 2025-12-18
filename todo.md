# RadioTocai - TODO

## Funcionalidades Implementadas
- [x] Projeto importado da plataforma anterior
- [x] Arquivos copiados para estrutura Manus
- [x] Dependências instaladas (Firebase, PeerJS, Google GenAI)
- [x] Erros de TypeScript corrigidos
- [x] Servidor de desenvolvimento rodando
- [x] Preview funcionando

## Próximas Tarefas
- [x] Corrigir contador de ouvintes - não está contando quando abre em dois celulares
- [x] Trocar senha do admin para Pagotto24
- [x] Adicionar seção de Programação na home mostrando a grade de horários do Schedule
- [ ] Garantir que funciona com os dois templates de cores
- [ ] Ajustes de design/cores (aguardando instruções do usuário)
- [ ] Novas funcionalidades (aguardando instruções do usuário)
- [ ] Publicação final

## Bugs Reportados
- [x] Corrigir layout quebrado - CSS não está sendo aplicado corretamente nos botões e elementos (CORRIGIDO - adicionado @import tailwindcss)
- [x] Adicionar link da Agencyl1 no rodapé do site
- [x] Remover copyright da RadioTocai do rodapé (deixar apenas Agencyl1.com)
- [x] Adicionar tabs por dia da semana na seção de Programação (Segunda, Terça, Quarta, etc.)
- [x] Diminuir fonte do menu de navegação no mobile (está passando do tamanho da tela)
- [x] Diminuir fonte do menu de navegação no mobile (está passando do tamanho da tela)
- [x] Adicionar logo da RadioTocai como favicon e ícone do player mobile (iOS lockscreen)
- [x] Logo não aparece no player do iOS (lockscreen) - precisa corrigir
- [x] Alterar slogan de "Sistema de Rádio Online" para "RadioTocai - tocando nossa época"
- [x] Implementar retomada automática da reprodução quando sair de apps que interrompem áudio (Instagram, TikTok, etc.)
- [x] Remover embaralhamento individual (cada pessoa ouve diferente)
- [x] Implementar sistema de rádio sincronizada (todos ouvem a mesma música ao mesmo tempo)
- [x] Adicionar transição suave entre programas (espera música terminar antes de mudar)
- [x] Criar relógio global da rádio no banco de dados
- [x] Corrigir bug: música pula para próxima antes de terminar (sincronização muito agressiva)
- [x] Adicionar contador de tempo total na tela de playlist (ex: "Total: 12 músicas • 1h 23min")
- [x] CRÍTICO: Sincronização entrando em loop infinito (músicas ficam mudando sem parar)
- [x] Remover sistema de sincronização global (causando loop) - manter apenas transição suave
- [x] Contador de tempo mostra "--:--" porque músicas não têm duração calculada
- [x] Ainda está embaralhando músicas - remover embaralhamento para tocar na ordem da lista
