# Guia Completo de Rastreamento do Quiz para Google Ads

## Visão Geral

O quiz possui rastreamento completo e profissional para Google Ads seguindo as melhores práticas:

✅ **Google Tag Manager instalado** (código no <head> e noscript após <body>)
✅ **IDs únicos seguindo padrão**: btn-[pagina]-[secao]-[acao]
✅ **Data attributes padronizados**: data-section, data-action, data-element
✅ **URLs com hash**: Cada etapa muda a URL com #step-1, #step-2, etc.
✅ **Rastreamento por step**: Cada botão de cada step tem ID único e data-step

## Implementações de Rastreamento

### 1. IDs Únicos Seguindo Padrão

Todos os botões e CTAs seguem o padrão: **btn-[pagina]-[secao]-[acao]**

**Botão Inicial (Hero)**
- ID: `btn-quiz-hero-start`
- Atributos: 
  - `data-section="hero"`
  - `data-action="start"`
  - `data-element="cta-button"`

**Botões de Resposta (cada pergunta)**
- ID: `btn-quiz-question{N}-option{M}` (ex: `btn-quiz-question1-option1`)
- Atributos:
  - `data-section="question-{N}"` (ex: `question-1`)
  - `data-action="answer"`
  - `data-element="option-button"`
  - `data-quiz-step="{N}"`
  - `data-quiz-question="{id}"` (ex: `goal`)
  - `data-quiz-option="{valor}"` (ex: `work`)
  - `data-quiz-option-index="{M}"`
  - `data-quiz-option-label="{texto}"`

**Botão Voltar**
- ID: `btn-quiz-question{N}-back` (ex: `btn-quiz-question2-back`)
- Atributos:
  - `data-section="question-{N}"`
  - `data-action="back"`
  - `data-element="navigation-button"`
  - `data-quiz-step="{N}"`

**Campos de Formulário**
- IDs: `input-quiz-form-name`, `input-quiz-form-phone`, `input-quiz-form-email`
- Atributos:
  - `data-section="form"`
  - `data-action="input"`
  - `data-element="text-field"` / `tel-field` / `email-field`
  - `data-quiz-field="name"` / `phone` / `email`

**Botão Enviar Formulário**
- ID: `btn-quiz-form-submit`
- Atributos:
  - `data-section="form"`
  - `data-action="submit"`
  - `data-element="submit-button"`
  - `data-quiz-step="captura"`

**Botão WhatsApp (Resultado)**
- ID: `btn-quiz-resultado-whatsapp`
- Atributos:
  - `data-section="resultado"`
  - `data-action="whatsapp"`
  - `data-element="cta-button"`
  - `data-quiz-step="concluido"`

**Botão Refazer (Resultado)**
- ID: `btn-quiz-resultado-restart`
- Atributos:
  - `data-section="resultado"`
  - `data-action="restart"`
  - `data-element="secondary-button"`

**Botão Recomeçar (Header)**
- ID: `btn-quiz-header-restart`
- Atributos:
  - `data-section="header"`
  - `data-action="restart"`
  - `data-element="navigation-button"`

### 2. URLs Dinâmicas com Hash

A URL muda conforme o usuário avança no quiz usando **hash (#)** para rastreamento de etapas:

- **Início**: `/quiz`
- **Pergunta 1**: `/quiz#step-1`
- **Pergunta 2**: `/quiz#step-2`
- **Pergunta N**: `/quiz#step-N`
- **Captura de dados**: `/quiz#step-captura`
- **Prova social**: `/quiz#step-prova-social`
- **Analisando**: `/quiz#step-analisando`
- **Resultado**: `/quiz#step-resultado`
- **Concluído**: `/quiz#step-concluido`

Essas URLs são alteradas usando `window.history.pushState()` sem recarregar a página, permitindo rastreamento preciso de cada etapa.

### 3. Eventos do Google Tag Manager

Cada interação envia eventos para o `dataLayer` do GTM:

#### Evento: `quiz_step_view`
Disparado automaticamente quando o usuário entra em uma nova etapa.

Dados enviados:
```javascript
{
  event: 'quiz_step_view',
  quiz_step: 'inicio' | 'pergunta-1' | 'pergunta-2' | ... | 'captura-dados' | 'prova-social' | 'analisando' | 'resultado' | 'concluido',
  quiz_step_number: 1 | 2 | 3 | ... | null,
  quiz_phase: 'hero' | 'quiz' | 'capture' | 'socialProof' | 'analyzing' | 'ready' | 'done'
}
```

#### Evento: `quiz_started`
Disparado quando o usuário clica no botão "Descobrir Minha Elegibilidade".

Dados enviados:
```javascript
{
  event: 'quiz_started',
  quiz_name: 'elegibilidade_visto_usa'
}
```

#### Evento: `quiz_answer`
Disparado quando o usuário seleciona uma resposta.

Dados enviados:
```javascript
{
  event: 'quiz_answer',
  quiz_question_id: 'goal' | 'education' | 'experience' | ...,
  quiz_question_number: 1 | 2 | 3 | ...,
  quiz_answer: 'work' | 'phd' | '10plus' | ...
}
```

#### Evento: `quiz_back`
Disparado quando o usuário clica no botão "Voltar".

Dados enviados:
```javascript
{
  event: 'quiz_back',
  quiz_question_number: 1 | 2 | 3 | ...
}
```

#### Evento: `quiz_completed`
Disparado quando o formulário é enviado com sucesso.

Dados enviados:
```javascript
{
  event: 'quiz_completed',
  quiz_lead_email: 'email@usuario.com',
  quiz_result_primary: 'EB-2 NIW' | 'EB-1A' | 'L-1A' | 'O-1A' | null
}
```

## Como Usar no Google Ads

### Opção 1: Rastrear por URL (Hash)
Configure conversões do Google Ads com base nas URLs com hash:
- Conversão "Quiz Iniciado": URL = `/quiz` (sem hash)
- Conversão "Pergunta 5 Respondida": URL contém `#step-5`
- Conversão "Formulário Preenchido": URL contém `#step-resultado`
- Conversão "Lead Completo": URL contém `#step-concluido`

### Opção 2: Rastrear por Cliques (IDs e Data Attributes)
Use os IDs padronizados ou data attributes para criar eventos de clique:

**Por ID:**
- Rastrear clique no ID `btn-quiz-hero-start`
- Rastrear clique no ID `btn-quiz-form-submit`
- Rastrear clique no ID `btn-quiz-resultado-whatsapp`

**Por Data Attributes:**
- Rastrear cliques em elementos com `data-section="form"` + `data-action="submit"`
- Rastrear cliques em elementos com `data-action="answer"` + `data-quiz-step="5"`
- Rastrear cliques em elementos com `data-element="cta-button"`

### Opção 3: Rastrear por Eventos GTM
Configure conversões do Google Ads no GTM usando os eventos customizados:
- Conversão "Quiz Iniciado": Evento = `quiz_started`
- Conversão "50% Completo": Evento = `quiz_step_view` + `quiz_step_number` ≥ 5
- Conversão "Dados Capturados": Evento = `quiz_step_view` + `quiz_step` = `resultado`
- Conversão "Lead Qualificado": Evento = `quiz_completed`

## Exemplo de Tag no GTM

Para rastrear quando um usuário chega na metade do quiz:

**Tipo de Gatilho**: Evento Personalizado
- Nome do evento: `quiz_step_view`
- Condição: `quiz_step_number` é maior que `5`

**Tipo de Tag**: Google Ads - Conversão
- ID de conversão: [Seu ID]
- Rótulo de conversão: [Seu rótulo]

## Classes CSS para Rastreamento

Todos os elementos interativos possuem classes CSS específicas para facilitar o rastreamento por clique:

- `.quiz-cta` - Todos os botões de call-to-action
- `.quiz-option` - Todas as opções de resposta do quiz
- `.quiz-input` - Todos os campos de formulário

Você pode criar eventos de clique no GTM usando essas classes.

## Funções JavaScript Helper

O site inclui funções globais no objeto `window.unlockedTracking` para facilitar rastreamento customizado:

### `trackEvent(eventName, eventData)`
Envia um evento customizado para o dataLayer.

Exemplo:
```javascript
window.unlockedTracking.trackEvent('custom_action', {
  action_name: 'button_click',
  value: 100
});
```

### `getCurrentStep()`
Retorna o step atual do quiz extraído da URL.

Exemplo:
```javascript
const currentStep = window.unlockedTracking.getCurrentStep();
// Retorna: 'inicio', '1', '2', 'captura', 'resultado', etc
```

### `trackConversion(conversionName, conversionValue)`
Rastreia uma conversão customizada.

Exemplo:
```javascript
window.unlockedTracking.trackConversion('custom_milestone', 150);
```

## Eventos Adicionais Implementados

### `quiz_milestone`
Disparado automaticamente quando o usuário atinge marcos importantes no quiz.

Marcos rastreados:
- 30% Completo (pergunta 3)
- 50% Completo (pergunta 5)
- 70% Completo (pergunta 7)
- Quiz Finalizado (pergunta 10)

Dados enviados:
```javascript
{
  event: 'quiz_milestone',
  milestone_name: '50% Completo',
  milestone_percent: 50
}
```

### `quiz_form_validated`
Disparado quando o formulário é preenchido corretamente antes de enviar.

Dados enviados:
```javascript
{
  event: 'quiz_form_validated',
  form_has_name: true,
  form_has_phone: true,
  form_has_email: true
}
```

### `conversion`
Disparado quando um lead é capturado com sucesso.

Dados enviados:
```javascript
{
  event: 'conversion',
  conversion_name: 'quiz_lead_captured',
  conversion_value: 1
}
```

### `page_view`
Disparado automaticamente ao carregar a página.

Dados enviados:
```javascript
{
  event: 'page_view',
  page_type: 'quiz_landing',
  page_url: window.location.href
}
```

## Dados Completos do Evento `quiz_completed`

O evento principal de conversão agora inclui dados detalhados do resultado:

```javascript
{
  event: 'quiz_completed',
  quiz_lead_email: 'usuario@email.com',
  quiz_lead_name: 'Nome do Usuário',
  quiz_lead_phone: '(41) 99999-9999',
  quiz_result_primary: 'EB-2 NIW',
  quiz_result_eb2niw: '4/6',
  quiz_result_eb1a: '3/10',
  quiz_result_l1a: '2/5',
  quiz_result_o1a: '3/10',
  quiz_is_potential_client: true
}
```

Isso permite segmentar conversões por qualidade do lead.

## Atributos Adicionais nos Elementos

### Botões de Opção do Quiz
Além dos atributos básicos, agora incluem:
- `data-quiz-option-index` - Posição da opção (1, 2, 3, etc)
- `data-quiz-option-label` - Texto completo da opção

### Botões CTA
- `data-quiz-location` - Onde o botão está localizado (`hero`, `form`)

### Campos de Formulário
- `data-quiz-field` - Nome do campo (`name`, `phone`, `email`)

## Dados Expandidos no `quiz_step_view`

O evento de visualização de step agora inclui:
```javascript
{
  event: 'quiz_step_view',
  quiz_step: 'pergunta-3',
  quiz_step_number: 3,
  quiz_phase: 'quiz',
  quiz_progress_percent: 30,
  quiz_total_questions: 10,
  page_path: '/quiz?step=3'
}
```

## Testando o Rastreamento

### Método 1: Console do Navegador
1. Abra o Developer Tools (F12)
2. Vá para a aba Console
3. Digite: `dataLayer`
4. Pressione Enter
5. Faça o quiz e observe os eventos sendo adicionados

### Método 2: Google Tag Assistant
1. Instale a extensão "Google Tag Assistant" no Chrome
2. Ative a extensão
3. Navegue pelo quiz
4. Veja os eventos sendo disparados em tempo real

### Método 3: Preview do GTM
1. Acesse o Google Tag Manager
2. Clique em "Preview"
3. Insira a URL do site
4. Navegue pelo quiz
5. Veja todos os eventos e variáveis no debugger

### Método 4: Teste de Funções Helper
```javascript
// No console do navegador:
window.unlockedTracking.getCurrentStep()
// Deve retornar o step atual

window.unlockedTracking.trackEvent('teste', {foo: 'bar'})
// Deve adicionar evento ao dataLayer

dataLayer
// Deve mostrar o array com todos os eventos incluindo o de teste
```

## Configurações Recomendadas no Google Ads

### Conversão 1: Quiz Iniciado
- **Nome**: Quiz Iniciado
- **Gatilho GTM**: Evento = `quiz_started`
- **Valor**: R$ 0
- **Contagem**: Uma por clique

### Conversão 2: Quiz 50% Completo
- **Nome**: Quiz Meio Caminho
- **Gatilho GTM**: Evento = `quiz_milestone` + `milestone_name` contém `50%`
- **Valor**: R$ 0
- **Contagem**: Uma por clique

### Conversão 3: Formulário Validado
- **Nome**: Dados Preenchidos
- **Gatilho GTM**: Evento = `quiz_form_validated`
- **Valor**: R$ 10
- **Contagem**: Uma por clique

### Conversão 4: Lead Capturado (PRINCIPAL)
- **Nome**: Lead Quiz Completo
- **Gatilho GTM**: Evento = `quiz_completed`
- **Valor**: R$ 50
- **Contagem**: Uma por clique

### Conversão 5: Lead Qualificado
- **Nome**: Lead Alta Qualidade
- **Gatilho GTM**: Evento = `quiz_completed` + `quiz_is_potential_client` = `true`
- **Valor**: R$ 150
- **Contagem**: Uma por clique

### Conversão 6: WhatsApp Click
- **Nome**: Contato WhatsApp
- **Gatilho GTM**: Clique em elemento com `id` = `quiz-whatsapp-button`
- **Valor**: R$ 100
- **Contagem**: Uma por clique

## Segmentação Avançada

Com os dados detalhados do `quiz_completed`, você pode criar públicos personalizados:

### Público: Leads EB-2 NIW Qualificados
- Evento = `quiz_completed`
- `quiz_result_primary` = `EB-2 NIW`
- `quiz_is_potential_client` = `true`

### Público: Leads em Análise
- Evento = `quiz_milestone`
- `milestone_percent` >= 50
- Mas NÃO evento `quiz_completed`

### Público: Abandonaram no Formulário
- Evento = `quiz_step_view`
- `quiz_step` = `resultado`
- Mas NÃO evento `quiz_form_validated`

## Script de Rastreamento Manual

Se quiser rastrear eventos personalizados, você pode adicionar este código em qualquer lugar:

```javascript
// Rastrear scroll profundo
let scrollTracked = false;
window.addEventListener('scroll', function() {
  const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
  if (scrollPercent > 75 && !scrollTracked) {
    window.unlockedTracking.trackEvent('deep_scroll', {
      scroll_percent: Math.round(scrollPercent)
    });
    scrollTracked = true;
  }
});

// Rastrear tempo na página
setTimeout(function() {
  window.unlockedTracking.trackEvent('time_on_page', {
    seconds: 30
  });
}, 30000);
```
