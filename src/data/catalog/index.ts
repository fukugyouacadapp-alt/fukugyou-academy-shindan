import { CARE } from './care'
import { CREATE } from './create'
import { FIELD } from './field'
import { OFFICE } from './office'
import { PLAN } from './plan'
import { TALK } from './talk'
import type { Family } from './types'

/** 仕事のタイプごとの部品。src/data/questions.ts の JOB_FAMILIES と同じ順に並べる */
export const FAMILIES: Family[] = [TALK, PLAN, OFFICE, CREATE, CARE, FIELD]
