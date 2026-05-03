import type { NamespaceTranslations } from '../types';

export const resourcesTranslations: NamespaceTranslations = {
  es: {
    header: {
      title: 'Recursos',
      subtitle: 'Informacion y herramientas utiles',
    },
    section: {
      attorneys: {
        title: 'Abogados',
        description: 'Abogados de inmigracion recomendados por la comunidad',
      },
      calculator: {
        title: 'Calculadora',
        description: 'Estima el tiempo de procesamiento de tu caso',
      },
      glossary: {
        title: 'Glosario',
        description: 'Terminos comunes de inmigracion',
        searchPlaceholder: 'Buscar termino...',
        empty: 'No se encontraron terminos',
      },
      visaBulletin: {
        title: 'Visa Bulletin',
        description: 'Fechas de prioridad actuales del Boletin de Visas',
        headerCategory: 'Categoria',
        headerDate: 'Fecha actual',
        note: '* Datos actualizados mensualmente por el Departamento de Estado',
      },
    },
    contact: {
      call: 'Llamar',
      email: 'Correo',
    },
    attorneys: {
      items: {
        maria: {
          specialty: 'Casos familiares y asilo',
        },
        carlos: {
          specialty: 'Visas de trabajo y EB-2 NIW',
        },
        ana: {
          specialty: 'DACA y ciudadania',
        },
      },
    },
    glossary: {
      category: {
        process: 'Proceso',
        program: 'Programa',
        document: 'Documento',
        form: 'Formulario',
        category: 'Categoria',
        agency: 'Agencia',
      },
      items: {
        aos: {
          definition: 'Proceso para cambiar tu estatus migratorio a residente permanente mientras estas en Estados Unidos.',
        },
        biometrics: {
          definition: 'Cita para tomar huellas dactilares, fotografia y firma como parte del proceso de inmigracion.',
        },
        consularProcessing: {
          definition: 'Proceso de obtener visa de inmigrante a traves de una embajada o consulado de EE.UU. en el extranjero.',
        },
        daca: {
          definition: 'Accion Diferida para los Llegados en la Infancia. Programa que protege de deportacion a ciertos inmigrantes que llegaron como menores.',
        },
        ead: {
          definition: 'Employment Authorization Document. Documento que autoriza trabajar legalmente en Estados Unidos.',
        },
        greenCard: {
          definition: 'Tarjeta de Residente Permanente. Documento que prueba el estatus de residente permanente legal.',
        },
        i485: {
          definition: 'Formulario para solicitar ajuste de estatus a residente permanente.',
        },
        i765: {
          definition: 'Formulario para solicitar autorizacion de empleo (EAD).',
        },
        niw: {
          definition: 'National Interest Waiver. Exencion por interes nacional para la categoria EB-2.',
        },
        priorityDate: {
          definition: 'Fecha que determina tu lugar en la fila para una visa de inmigrante.',
        },
        rfe: {
          definition: 'Request for Evidence. Solicitud de USCIS para documentacion adicional.',
        },
        uscis: {
          definition: 'U.S. Citizenship and Immigration Services. Agencia que procesa solicitudes de inmigracion.',
        },
      },
    },
    visaBulletin: {
      area: {
        allChargeability: 'Todas las areas',
        chinaIndia: 'China/India',
      },
      currentDate: 'Actual',
      movement: {
        forward: '↑ Avanzo',
        retrogressed: '↓ Retrocedio',
        current: '● Actual',
      },
    },
    calculator: {
      formTypeLabel: 'Tipo de formulario',
      serviceCenterLabel: 'Centro de servicio',
      resultLabel: 'Tiempo estimado de procesamiento',
      centers: {
        fieldOffice: 'Oficina local',
      },
      weeks: '{{count}} semanas',
      monthsApprox: 'Aproximadamente {{count}} meses',
    },
  },
  en: {
    header: {
      title: 'Resources',
      subtitle: 'Useful information and tools',
    },
    section: {
      attorneys: {
        title: 'Attorneys',
        description: 'Immigration attorneys recommended by the community',
      },
      calculator: {
        title: 'Calculator',
        description: 'Estimate your case processing time',
      },
      glossary: {
        title: 'Glossary',
        description: 'Common immigration terms',
        searchPlaceholder: 'Search term...',
        empty: 'No terms found',
      },
      visaBulletin: {
        title: 'Visa Bulletin',
        description: 'Current priority dates from the Visa Bulletin',
        headerCategory: 'Category',
        headerDate: 'Current date',
        note: '* Data updated monthly by the Department of State',
      },
    },
    contact: {
      call: 'Call',
      email: 'Email',
    },
    attorneys: {
      items: {
        maria: {
          specialty: 'Family cases and asylum',
        },
        carlos: {
          specialty: 'Work visas and EB-2 NIW',
        },
        ana: {
          specialty: 'DACA and citizenship',
        },
      },
    },
    glossary: {
      category: {
        process: 'Process',
        program: 'Program',
        document: 'Document',
        form: 'Form',
        category: 'Category',
        agency: 'Agency',
      },
      items: {
        aos: {
          definition: 'Process to change your immigration status to permanent resident while you are in the United States.',
        },
        biometrics: {
          definition: 'Appointment to collect fingerprints, photo, and signature as part of the immigration process.',
        },
        consularProcessing: {
          definition: 'Process of obtaining an immigrant visa through a U.S. embassy or consulate abroad.',
        },
        daca: {
          definition: 'Deferred Action for Childhood Arrivals. Program that protects certain immigrants who arrived as minors from deportation.',
        },
        ead: {
          definition: 'Employment Authorization Document. Document that authorizes you to work legally in the United States.',
        },
        greenCard: {
          definition: 'Permanent Resident Card. Document that proves lawful permanent resident status.',
        },
        i485: {
          definition: 'Form used to apply for adjustment of status to permanent resident.',
        },
        i765: {
          definition: 'Form used to apply for employment authorization (EAD).',
        },
        niw: {
          definition: 'National Interest Waiver for the EB-2 category.',
        },
        priorityDate: {
          definition: 'Date that determines your place in line for an immigrant visa.',
        },
        rfe: {
          definition: 'Request for Evidence. USCIS request for additional documentation.',
        },
        uscis: {
          definition: 'U.S. Citizenship and Immigration Services. Agency that processes immigration applications.',
        },
      },
    },
    visaBulletin: {
      area: {
        allChargeability: 'All Chargeability Areas',
        chinaIndia: 'China/India',
      },
      currentDate: 'Current',
      movement: {
        forward: '↑ Advanced',
        retrogressed: '↓ Retrogressed',
        current: '● Current',
      },
    },
    calculator: {
      formTypeLabel: 'Form type',
      serviceCenterLabel: 'Service center',
      resultLabel: 'Estimated processing time',
      centers: {
        fieldOffice: 'Field office',
      },
      weeks: '{{count}} weeks',
      monthsApprox: 'Approximately {{count}} months',
    },
  },
  pt: {
    header: {
      title: 'Recursos',
      subtitle: 'Informacoes e ferramentas uteis',
    },
    section: {
      attorneys: {
        title: 'Advogados',
        description: 'Advogados de imigracao recomendados pela comunidade',
      },
      calculator: {
        title: 'Calculadora',
        description: 'Estime o tempo de processamento do seu caso',
      },
      glossary: {
        title: 'Glossario',
        description: 'Termos comuns de imigracao',
        searchPlaceholder: 'Buscar termo...',
        empty: 'Nenhum termo encontrado',
      },
      visaBulletin: {
        title: 'Visa Bulletin',
        description: 'Datas de prioridade atuais do Visa Bulletin',
        headerCategory: 'Categoria',
        headerDate: 'Data atual',
        note: '* Dados atualizados mensalmente pelo Departamento de Estado',
      },
    },
    contact: {
      call: 'Ligar',
      email: 'Email',
    },
    attorneys: {
      items: {
        maria: {
          specialty: 'Casos familiares e asilo',
        },
        carlos: {
          specialty: 'Vistos de trabalho e EB-2 NIW',
        },
        ana: {
          specialty: 'DACA e cidadania',
        },
      },
    },
    glossary: {
      category: {
        process: 'Processo',
        program: 'Programa',
        document: 'Documento',
        form: 'Formulario',
        category: 'Categoria',
        agency: 'Agencia',
      },
      items: {
        aos: {
          definition: 'Processo para mudar seu status migratorio para residente permanente enquanto voce esta nos Estados Unidos.',
        },
        biometrics: {
          definition: 'Agendamento para coletar impressoes digitais, foto e assinatura como parte do processo de imigracao.',
        },
        consularProcessing: {
          definition: 'Processo de obter um visto de imigrante por meio de uma embaixada ou consulado dos EUA no exterior.',
        },
        daca: {
          definition: 'Acao Diferida para Chegadas na Infancia. Programa que protege da deportacao certos imigrantes que chegaram quando menores.',
        },
        ead: {
          definition: 'Employment Authorization Document. Documento que autoriza trabalhar legalmente nos Estados Unidos.',
        },
        greenCard: {
          definition: 'Cartao de Residente Permanente. Documento que comprova o status de residente permanente legal.',
        },
        i485: {
          definition: 'Formulario usado para solicitar ajuste de status para residente permanente.',
        },
        i765: {
          definition: 'Formulario usado para solicitar autorizacao de emprego (EAD).',
        },
        niw: {
          definition: 'National Interest Waiver para a categoria EB-2.',
        },
        priorityDate: {
          definition: 'Data que determina sua posicao na fila para um visto de imigrante.',
        },
        rfe: {
          definition: 'Request for Evidence. Solicitacao da USCIS para documentacao adicional.',
        },
        uscis: {
          definition: 'U.S. Citizenship and Immigration Services. Agencia que processa solicitacoes de imigracao.',
        },
      },
    },
    visaBulletin: {
      area: {
        allChargeability: 'Todas as areas',
        chinaIndia: 'China/India',
      },
      currentDate: 'Atual',
      movement: {
        forward: '↑ Avancou',
        retrogressed: '↓ Retrocedeu',
        current: '● Atual',
      },
    },
    calculator: {
      formTypeLabel: 'Tipo de formulario',
      serviceCenterLabel: 'Centro de servico',
      resultLabel: 'Tempo estimado de processamento',
      centers: {
        fieldOffice: 'Escritorio local',
      },
      weeks: '{{count}} semanas',
      monthsApprox: 'Aproximadamente {{count}} meses',
    },
  },
};