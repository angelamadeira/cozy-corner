// Inferência de ícone Phosphor (line-art thin) a partir do nome do material.
// Match na ORDEM em que aparece — regras mais específicas vêm antes das genéricas.

const RULES: ReadonlyArray<{ match: RegExp; icon: string }> = [
  // Eletro
  { match: /batedeira|liquidificador|processador|mixer|mixer/i, icon: 'ph:lightning-thin' },
  { match: /microondas|micro-?ondas/i,                          icon: 'ph:microphone-stage-thin' },

  // Forno e calor
  { match: /forno|fog[ãa]o|chama/i,                             icon: 'ph:fire-thin' },
  { match: /assadeira|forma|bandeja/i,                          icon: 'ph:square-thin' },

  // Panelas
  { match: /panela|caçarola|wok|p[aá]nela/i,                    icon: 'ph:cooking-pot-thin' },
  { match: /frigideira|skillet/i,                               icon: 'ph:cooking-pot-thin' },

  // Cortantes
  { match: /faca|cutelo/i,                                      icon: 'ph:knife-thin' },
  { match: /t[áa]bua/i,                                         icon: 'ph:rectangle-thin' },
  { match: /tesoura/i,                                          icon: 'ph:scissors-thin' },

  // Utensílios
  { match: /colher|garfo|concha|esp[áa]tula|p[ãa]o de queijo/i, icon: 'ph:fork-knife-thin' },
  { match: /rolo/i,                                             icon: 'ph:cylinder-thin' },

  // Recipientes
  { match: /tigela|bowl|prato|recipiente|jarra|copo medidor/i,  icon: 'ph:bowl-food-thin' },

  // Filtragem
  { match: /ralador|peneira|coador|escorredor/i,                icon: 'ph:funnel-thin' },

  // Medição
  { match: /balan[çc]a|peso/i,                                  icon: 'ph:scales-thin' },
  { match: /timer|cron[oô]metro|rel[óo]gio/i,                   icon: 'ph:timer-thin' },
  { match: /term[oô]metro/i,                                    icon: 'ph:thermometer-thin' },
];

const FALLBACK_ICON = 'ph:dot-outline-thin';

export function iconForMaterial(text: string): string {
  for (const rule of RULES) {
    if (rule.match.test(text)) return rule.icon;
  }
  return FALLBACK_ICON;
}
