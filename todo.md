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
- [x] Substituir logo do favicon e player mobile pelo novo logo (radio_tocai_logo_v4.png)
- [ ] Logo do header (canto superior esquerdo) está usando logo antigo - substituir pelo novo logo colorido
- [x] Atualizar credenciais da API do Cloudflare R2 (novas chaves fornecidas)
- [x] Erro de CORS no upload - adicionar prefixo /radiotocai nas chaves de upload do R2
- [x] Corrigir erro de CORS no upload de músicas - ajustar AllowedHeaders no bucket R2
- [x] Atualizar Secret Access Key correta do R2 (estava com caractere errado)
- [x] Corrigir formato de requisição tRPC no storageService (erro BAD_REQUEST)
- [x] Reverter para upload direto do navegador (código original) com credenciais corretas
- [x] Consertar chamadas do frontend para usar backend tRPC corretamente
- [x] Corrigir transição entre programas - esperar música terminar antes de trocar
- [x] Corrigir bug: transição trava quando música termina (não troca de programa)
- [x] Corrigir sistema de troca de músicas (às vezes para, às vezes corta bruscamente)
- [x] Adicionar ícone de coração piscando no menu (entre Contato e relógio)
- [x] Remover seção "Histórias de Amor" da home (manter só na página dedicada)
- [x] Corrigir bug: sistema não carrega playlist na transição (estava usando ID do schedule ao invés do playlistId)
- [x] Corrigir erro 400 Bad Request ao criar pasta no R2 (corrigido formato tRPC batch)
- [x] Corrigir erro persistente 400 Bad Request - era Account ID errado (316ccd → 316cd)
- [x] Pastas sendo criadas com prefixo 'radiotocai/' ao invés da raiz do bucket (CORRIGIDO)
- [x] Erro 400 BAD_REQUEST ao fazer upload de música (adicionado ?batch=1)
- [x] Implementar deleção de pasta no R2 quando apagar no frontend
