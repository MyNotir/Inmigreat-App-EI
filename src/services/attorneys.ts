/**
 * Attorneys service — directory + profile + contact request.
 *
 * Currently mock-backed for the EI redesign preview. The shape mirrors what
 * the backend will return; swap getAttorneys/getAttorney/createContactRequest
 * to real fetch() calls when the backend lands. The component layer doesn't
 * need to change.
 */

import type {
  Attorney,
  AttorneySpecialty,
  CaseTypeMatch,
  ContactRequest,
  Language,
} from '../types/attorney';

const MOCK_ATTORNEYS: Attorney[] = [
  {
    id: 'atty-001',
    name: 'María García López',
    pronouns: 'ella',
    firm: 'García Immigration Law',
    barVerified: true,
    barNumbers: [{ state: 'FL', number: '0123456' }],
    yearsExperience: 12,
    languages: ['es', 'en'],
    specialties: ['asylum', 'humanitarian', 'family'],
    caseTypeTags: ['I-589', 'U-visa', 'T-visa', 'I-130'],
    location: 'Miami, FL',
    remoteOK: true,
    bio: 'Llegué a este país a los 7 años. Sé lo que se siente esperar 5 años por una respuesta. Por eso me dedico a casos de asilio, U-visa, y reunificación familiar — los procesos donde la espera duele más. Mi equipo te explica todo en español, sin jerga, y nunca te dejamos sin saber qué viene después.',
    mission: 'Que ningún migrante navegue su caso solo, sin importar cuánto pueda pagar.',
    rates: {
      consultLow: 0,
      consultHigh: 0,
      firstConsultFree: true,
      slidingScale: true,
      paymentPlan: true,
      flatFees: {
        'I-589': 4500,
        'U-visa': 3500,
        'I-130': 1800,
      },
    },
    rating: 4.9,
    casesCompleted: 387,
    reviews: [
      {
        id: 'r-001',
        reviewerCaseType: 'I-589',
        rating: 5,
        body: 'Después de tres años esperando, María nos consiguió aprobación. Nunca dejó de responder mensajes. Habla español como nosotros, no como un libro.',
        postedAt: '2026-03-12',
        languageUsed: 'es',
      },
      {
        id: 'r-002',
        reviewerCaseType: 'U-visa',
        rating: 5,
        body: 'Me sentí escuchada desde la primera llamada gratis. Trabajamos sliding scale y no me cobró lo que no tenía. Hoy tengo permiso de trabajo.',
        postedAt: '2026-02-28',
        languageUsed: 'es',
      },
    ],
    availability: {
      acceptingClients: true,
      averageResponseHours: 12,
      emergencyAvailable: true,
    },
  },
  {
    id: 'atty-002',
    name: 'Carlos Rodríguez',
    pronouns: 'él',
    firm: 'Rodríguez & Associates',
    barVerified: true,
    barNumbers: [{ state: 'NY', number: '5872194' }],
    yearsExperience: 18,
    languages: ['es', 'en', 'pt'],
    specialties: ['employment', 'naturalization'],
    caseTypeTags: ['I-485', 'I-140', 'N-400'],
    location: 'New York, NY',
    remoteOK: true,
    bio: 'EB-2 NIW, PERM, I-140, ajuste de estatus para profesionales. 18 años haciendo solo casos de empleo. Te digo si tu caso es fuerte antes de cobrarte un dólar.',
    mission: 'Honestidad antes de retención. Si tu caso no es fuerte, te lo digo.',
    rates: {
      consultLow: 250,
      consultHigh: 350,
      firstConsultFree: true,
      slidingScale: false,
      paymentPlan: true,
      flatFees: {
        'I-485': 3800,
        'I-140': 5500,
        'N-400': 1500,
      },
    },
    rating: 4.8,
    casesCompleted: 612,
    reviews: [
      {
        id: 'r-003',
        reviewerCaseType: 'I-140',
        rating: 5,
        body: 'Carlos rechazó mi caso al inicio porque dijo que no era lo suficientemente fuerte. Volví un año después con más publicaciones, y esta vez aprobamos. Su honestidad me ahorró $5K.',
        postedAt: '2026-04-05',
        languageUsed: 'en',
      },
    ],
    availability: {
      acceptingClients: true,
      averageResponseHours: 24,
      emergencyAvailable: false,
    },
  },
  {
    id: 'atty-003',
    name: 'Ana Martínez',
    pronouns: 'ella',
    firm: 'Martínez Legal Group',
    barVerified: true,
    barNumbers: [{ state: 'TX', number: '7019283' }],
    yearsExperience: 8,
    languages: ['es', 'en'],
    specialties: ['daca', 'citizenship', 'naturalization'],
    caseTypeTags: ['DACA', 'N-400'],
    location: 'Houston, TX',
    remoteOK: true,
    bio: 'DACA renovaciones, ciudadanía derivativa, N-400. Atiendo en Houston pero tomo casos remotos en TX, NM, AZ. Aceptamos planes de pago de $50/mes para que nadie se quede afuera por dinero.',
    mission: 'DACA renewal a tiempo, siempre. Si no llego a tu fecha, no te cobro.',
    rates: {
      consultLow: 100,
      consultHigh: 150,
      firstConsultFree: true,
      slidingScale: true,
      paymentPlan: true,
      flatFees: {
        DACA: 800,
        'N-400': 1200,
      },
    },
    rating: 4.7,
    casesCompleted: 245,
    reviews: [
      {
        id: 'r-004',
        reviewerCaseType: 'DACA',
        rating: 5,
        body: 'Tres renovaciones con Ana, siempre puntual. Cuando perdí el trabajo, me dejó pagar $50/mes hasta terminar. Es de las nuestras.',
        postedAt: '2026-03-30',
        languageUsed: 'es',
      },
    ],
    availability: {
      acceptingClients: true,
      averageResponseHours: 8,
      emergencyAvailable: true,
    },
  },
  {
    id: 'atty-004',
    name: 'Sara Beth Cohen',
    pronouns: 'ella',
    firm: 'Cohen Removal Defense',
    barVerified: true,
    barNumbers: [{ state: 'CA', number: '4019283' }, { state: 'NY', number: '8842910' }],
    yearsExperience: 22,
    languages: ['en', 'es'],
    specialties: ['removal', 'asylum'],
    caseTypeTags: ['EOIR', 'I-589'],
    location: 'Los Angeles, CA',
    remoteOK: true,
    bio: 'Defensa en corte de inmigración (EOIR), apelaciones BIA, motions to reopen. 22 años. Si te llegó NTA o tienes audiencia en menos de 30 días, llámame. Inglés y español, esposo de migrante salvadoreño.',
    mission: 'Nadie es deportado por no tener un buen abogado. Tomamos casos pro bono cuando el sistema falla.',
    rates: {
      consultLow: 0,
      consultHigh: 0,
      firstConsultFree: true,
      slidingScale: true,
      paymentPlan: true,
      flatFees: {
        EOIR: 7500,
        'I-589': 5500,
      },
    },
    rating: 4.95,
    casesCompleted: 891,
    reviews: [
      {
        id: 'r-005',
        reviewerCaseType: 'EOIR',
        rating: 5,
        body: 'Tenía audiencia en 11 días y todos me decían que era imposible. Sara nos preparó. Ganamos cancellation. No tengo palabras.',
        postedAt: '2026-04-15',
        languageUsed: 'es',
      },
    ],
    availability: {
      acceptingClients: true,
      averageResponseHours: 4,
      emergencyAvailable: true,
    },
  },
  {
    id: 'atty-005',
    name: 'Jean-Pierre Dubois',
    firm: 'Dubois Family Immigration',
    barVerified: true,
    barNumbers: [{ state: 'MA', number: '2391048' }],
    yearsExperience: 9,
    languages: ['fr', 'ht', 'en', 'es'],
    specialties: ['family', 'humanitarian'],
    caseTypeTags: ['I-130', 'I-589'],
    location: 'Boston, MA',
    remoteOK: true,
    bio: 'Atendiendo comunidades haitianas y francófonas en Nueva Inglaterra. I-130 reunificación, I-589 asilo, asistencia para haitianos con TPS. Trabajo con organizaciones sin fines de lucro y aceptamos sliding scale.',
    rates: {
      consultLow: 0,
      consultHigh: 0,
      firstConsultFree: true,
      slidingScale: true,
      paymentPlan: true,
      flatFees: {
        'I-130': 1800,
        'I-589': 4200,
      },
    },
    rating: 4.85,
    casesCompleted: 178,
    reviews: [
      {
        id: 'r-006',
        reviewerCaseType: 'I-589',
        rating: 5,
        body: 'Avoka tradui dosye mwen an nan kreyòl. Sa fè yon diferans. Mwen santi mwen tande.',
        postedAt: '2026-03-22',
        languageUsed: 'ht',
      },
    ],
    availability: {
      acceptingClients: true,
      averageResponseHours: 18,
      emergencyAvailable: false,
    },
  },
];

export type AttorneyFilter = {
  specialty?: AttorneySpecialty;
  caseType?: CaseTypeMatch;
  language?: Language;
  slidingScaleOnly?: boolean;
  freeConsultOnly?: boolean;
  emergencyOnly?: boolean;
  /** Substring search on name / firm / bio. */
  query?: string;
};

const DELAY_MS = 350;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), DELAY_MS));
}

export const attorneysService = {
  async getAttorneys(filter?: AttorneyFilter): Promise<Attorney[]> {
    let list = MOCK_ATTORNEYS;
    if (filter?.specialty) {
      list = list.filter((a) => a.specialties.includes(filter.specialty as AttorneySpecialty));
    }
    if (filter?.caseType) {
      list = list.filter((a) => a.caseTypeTags.includes(filter.caseType as CaseTypeMatch));
    }
    if (filter?.language) {
      list = list.filter((a) => a.languages.includes(filter.language as Language));
    }
    if (filter?.slidingScaleOnly) {
      list = list.filter((a) => a.rates.slidingScale);
    }
    if (filter?.freeConsultOnly) {
      list = list.filter((a) => a.rates.firstConsultFree);
    }
    if (filter?.emergencyOnly) {
      list = list.filter((a) => a.availability.emergencyAvailable);
    }
    if (filter?.query?.trim()) {
      const q = filter.query.trim().toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.firm.toLowerCase().includes(q) ||
          a.bio.toLowerCase().includes(q),
      );
    }
    // Sort: emergency-available first, then by rating, then by yearsExperience.
    list = [...list].sort((a, b) => {
      if (a.availability.emergencyAvailable !== b.availability.emergencyAvailable) {
        return a.availability.emergencyAvailable ? -1 : 1;
      }
      if (a.rating !== b.rating) return b.rating - a.rating;
      return b.yearsExperience - a.yearsExperience;
    });
    return delay(list);
  },

  async getAttorney(id: string): Promise<Attorney | null> {
    const found = MOCK_ATTORNEYS.find((a) => a.id === id) ?? null;
    return delay(found);
  },

  async createContactRequest(request: ContactRequest): Promise<{ ok: true; ticketId: string }> {
    // In production, POST /api/attorneys/{attorneyId}/contact-requests with consent payload.
    // Server stores the request, notifies the attorney via email/SMS, and emits a ticket id.
    console.log('[attorneysService] createContactRequest', request);
    return delay({ ok: true as const, ticketId: `tkt-${Date.now()}` });
  },
};
