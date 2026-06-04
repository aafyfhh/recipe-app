export interface Recipe {
  id: string
  name: string
  emoji: string
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  calories: number
  protein: number
  fat: number
  carbs: number
  time: number // 制作时间(min)
  difficulty: '简单' | '中等' | '困难'
  tags: string[]
  ingredients: string[]
  steps: string[]
}

export interface DailyMeal {
  breakfast: Recipe | null
  lunch: Recipe | null
  dinner: Recipe | null
  snacks: Recipe[]
}

export type MealCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'all'

export const CATEGORY_LABELS: Record<string, string> = {
  all: '全部',
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐',
}

export const CATEGORY_EMOJI: Record<string, string> = {
  all: '🍽️',
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
}
