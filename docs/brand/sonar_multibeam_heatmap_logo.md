# 📡 Sonar Multibeam: A Paleta Autêntica de Calor Acústico (Azul / Verde / Vermelho)

---

## 1. Diagnóstico da Tela Real de Sonar

A imagem que você enviou é de um **Sonar Multifeixe / Ecobatímetro Hidroacústico Profissional (*Multibeam Echosounder / Sonar Fishfinder*)**.

Na física dos sonares, a cor **não é decorativa** — ela representa a **intensidade do retorno acústico (*Decibels / Backscatter Intensity*)**:

```
[ AZUL ABISSAL ] ──> [ CIANO / VERDE ] ──> [ AMARELO / LARANJA ] ──> [ VERMELHO VIVO ]
Baixa densidade      Média reflexão         Zona de ressonância        Máxima energia acústica
(Coluna de água)     (Ecos difusos)         (Afinidade alta)           (Contato sólido / Núcleo)
```

1. **Azul Marinho / Ciano**: Representa o oceano aberto e as frequências de propagação inicial.
2. **Verde / Lima**: O retorno do sinal ganhando forma e densidade.
3. **Vermelho / Laranja Incandescente**: O ponto de maior energia acústica (o "alvo detectado" ou o núcleo de ressonância musical).

---

## 2. Aplicação Direta no seu Rascunho

Ao aplicar esse gradiente térmico acústico aos nós do seu desenho:

* **Onda de Origem (Esquerda)**: Começa em **Azul Elétrico / Ciano** (`#00d4ff`).
* **Arco de Transição (Centro)**: Passa pelo **Verde Sonar / Lima** (`#10b981` a `#84cc16`).
* **Núcleo Focal (Direita)**: O grande nó e as esferas mais densas explodem em **Vermelho Acústico / Laranja Solar** (`#ff3b30` a `#ff6b00`), simulando o contato acústico perfeito!

---

## 3. Protótipo Vetorial SVG (Multibeam Heatmap)

Abaixo está o código vetorial puro implementando a progressão exata **Azul -> Verde -> Vermelho**:

```xml
<svg viewBox="0 0 540 210" width="100%" height="210" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Gradiente Térmico Multibeam Sonar -->
    <linearGradient id="multibeamHeat" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00d4ff" />    <!-- Azul Ciano -->
      <stop offset="35%" stop-color="#10b981" />   <!-- Verde Sonar -->
      <stop offset="70%" stop-color="#facc15" />   <!-- Amarelo Energia -->
      <stop offset="100%" stop-color="#ff3b30" />  <!-- Vermelho Máxima Intensidade -->
    </linearGradient>

    <!-- Gradiente do Grande Nó Central (Explosão de Eco Vermelho) -->
    <radialGradient id="coreRedPulse" cx="40%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#ff6b00" />
      <stop offset="75%" stop-color="#ff2a2a" />
      <stop offset="100%" stop-color="#b91c1c" />
    </radialGradient>

    <!-- Filtro de Lâmpada de Fósforo / CRT Radar Glow -->
    <filter id="sonarHeatGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- Fundo Preto Marinho Abissal -->
  <rect width="100%" height="100%" fill="#030712" rx="20" />

  <!-- Arcos Cones de Radar Sutis (Estilo da tela do Sonar) -->
  <path d="M 20 105 L 260 25" stroke="#0ea5e9" stroke-opacity="0.12" stroke-width="1.5" />
  <path d="M 20 105 L 260 185" stroke="#0ea5e9" stroke-opacity="0.12" stroke-width="1.5" />
  <path d="M 20 105 L 260 105" stroke="#0ea5e9" stroke-opacity="0.08" stroke-dasharray="2,4" />

  <!-- NÓS COM A ESCALA TÉRMICA DO MULTIBEAM -->
  <g filter="url(#sonarHeatGlow)">
    <!-- 1. Origem: Azul Ciano (Baixa Densidade) -->
    <circle cx="35" cy="105" r="6" fill="#00d4ff" opacity="0.8" />
    <circle cx="65" cy="105" r="8.5" fill="#00e5ff" opacity="0.9" />

    <!-- 2. Coluna Transição Azul -> Verde -->
    <circle cx="100" cy="60" r="5" fill="#00d4ff" opacity="0.7" />
    <circle cx="100" cy="85" r="6.5" fill="#05f1cd" />
    <circle cx="100" cy="105" r="12" fill="#10b981" />
    <circle cx="100" cy="125" r="6.5" fill="#05f1cd" />
    <circle cx="100" cy="150" r="5" fill="#00d4ff" opacity="0.7" />

    <!-- 3. Coluna Verde -> Amarelo -->
    <circle cx="138" cy="45" r="7.5" fill="#10b981" opacity="0.8" />
    <circle cx="138" cy="75" r="9.5" fill="#34d399" />
    <circle cx="138" cy="105" r="14.5" fill="#a3e635" />
    <circle cx="138" cy="135" r="9.5" fill="#34d399" />
    <circle cx="138" cy="165" r="7.5" fill="#10b981" opacity="0.8" />

    <!-- 4. Coluna Amarelo -> Laranja -->
    <circle cx="180" cy="40" r="10" fill="#facc15" />
    <circle cx="180" cy="72" r="12" fill="#fb923c" />
    <circle cx="180" cy="105" r="15" fill="#f97316" />
    <circle cx="180" cy="138" r="12" fill="#fb923c" />
    <circle cx="180" cy="170" r="10" fill="#facc15" />

    <!-- 5. Arco Lateral de Alta Intensidade -->
    <circle cx="225" cy="50" r="12.5" fill="#f97316" />
    <circle cx="225" cy="160" r="12.5" fill="#f97316" />

    <!-- 6. O GRANDE NÚCLEO FOCAL: VERMELHO VIVO (MÁXIMO ECO DO SONAR) -->
    <circle cx="230" cy="105" r="26" fill="url(#coreRedPulse)" stroke="#fecaca" stroke-width="2.5" />
  </g>

  <!-- Tipografia SONAR com Destaque Acústico -->
  <text x="300" y="112" font-family="system-ui, -apple-system, sans-serif" font-size="34" font-weight="900" letter-spacing="4" fill="#ffffff">
    SONAR
  </text>
  <text x="302" y="134" font-family="system-ui, -apple-system, sans-serif" font-size="10.5" font-weight="700" letter-spacing="2.5" fill="#ff453a" opacity="0.95">
    ACOUSTIC DISCOVERY
  </text>
</svg>
```

---

## 4. O Impacto no App

Essa combinação de **Azul + Verde + Vermelho** é exatamente o mapa térmico de ecolocalização:
- Torna a identidade visual **vibrante, orgânica e inesquecível**.
- No grafo do Cytoscape, as bandas mais distantes podem ter tons de azul/verde, enquanto as descobertas com 100% de afinidade se iluminam no **vermelho/laranja de retorno máximo**!
