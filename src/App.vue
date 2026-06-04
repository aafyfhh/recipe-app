<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { getRecipesByCategory, getRandomRecipe } from './data/recipes'
import type { Recipe, DailyMeal, MealCategory } from './types'
import { CATEGORY_LABELS, CATEGORY_EMOJI } from './types'

// ---- 状态 ----
const activeTab = ref<'picker' | 'recipes' | 'plan'>('picker')
const activeCategory = ref<MealCategory>('all')
const maxCalories = ref(600)
const selectedRecipe = ref<Recipe | null>(null)
const showDetail = ref(false)
const dailyMeal = ref<DailyMeal>({ breakfast: null, lunch: null, dinner: null, snacks: [] })
const dailyCalorieGoal = ref(1500)
const showGoalInput = ref(false)
const goalInputValue = ref('1500')
const showPickerCalorieFilter = ref(true)

// 从 localStorage 恢复
const savedGoal = localStorage.getItem('calorie-goal')
if (savedGoal) dailyCalorieGoal.value = Number(savedGoal)
const savedPlan = localStorage.getItem('daily-plan')
if (savedPlan) {
  try { dailyMeal.value = JSON.parse(savedPlan) } catch {}
}

// ---- 计算属性 ----
const filteredRecipes = computed(() => {
  let list = getRecipesByCategory(activeCategory.value)
  if (showPickerCalorieFilter.value && activeTab.value === 'picker') {
    list = list.filter(r => r.calories <= maxCalories.value)
  }
  return list
})

const todayCalories = computed(() => {
  let total = 0
  if (dailyMeal.value.breakfast) total += dailyMeal.value.breakfast.calories
  if (dailyMeal.value.lunch) total += dailyMeal.value.lunch.calories
  if (dailyMeal.value.dinner) total += dailyMeal.value.dinner.calories
  dailyMeal.value.snacks.forEach(s => total += s.calories)
  return total
})

const caloriePercent = computed(() =>
  Math.min(100, Math.round((todayCalories.value / dailyCalorieGoal.value) * 100))
)

const calorieBarClass = computed(() => {
  const p = caloriePercent.value
  if (p > 100) return 'danger'
  if (p > 80) return 'warning'
  return ''
})

const remainingCalories = computed(() => dailyCalorieGoal.value - todayCalories.value)

// ---- 方法 ----
function pickRandom() {
  const result = getRandomRecipe(activeCategory.value === 'all' ? 'all' : activeCategory.value, maxCalories.value)
  if (result) {
    selectedRecipe.value = result
    // 如果已经有相同的菜，就不重复震动效果
  }
}

function openDetail(recipe: Recipe) {
  selectedRecipe.value = recipe
  showDetail.value = true
}

function closeDetail() {
  showDetail.value = false
}

function getMealSlotLabel(category: string): string {
  const map: Record<string, string> = {
    breakfast: '早餐',
    lunch: '午餐',
    dinner: '晚餐',
    snack: '加餐',
  }
  return map[category] || category
}

function addToPlan() {
  if (!selectedRecipe.value) return
  const recipe = selectedRecipe.value
  if (recipe.category === 'snack') {
    if (!dailyMeal.value.snacks.some(s => s.id === recipe.id)) {
      dailyMeal.value.snacks.push(recipe)
    }
  } else {
    ;(dailyMeal.value as any)[recipe.category] = recipe
  }
  savePlan()
  closeDetail()
}

function removeFromPlan(category: string, snackId?: string) {
  if (category === 'snack' && snackId) {
    dailyMeal.value.snacks = dailyMeal.value.snacks.filter(s => s.id !== snackId)
  } else {
    ;(dailyMeal.value as any)[category] = null
  }
  savePlan()
}

function savePlan() {
  localStorage.setItem('daily-plan', JSON.stringify(dailyMeal.value))
}

function saveGoal() {
  const val = Number(goalInputValue.value)
  if (val >= 800 && val <= 4000) {
    dailyCalorieGoal.value = val
    localStorage.setItem('calorie-goal', String(val))
  }
  showGoalInput.value = false
}

function openGoalInput() {
  goalInputValue.value = String(dailyCalorieGoal.value)
  showGoalInput.value = true
}

// 监听 maxCalories 变化时重新随机
watch(maxCalories, () => {
  if (activeTab.value === 'picker') pickRandom()
})

// ---- 初始化 ----
pickRandom()
</script>

<template>
  <div class="header">
    <h1>🥗 今天吃什么</h1>
    <div class="header-subtitle">减肥菜谱 · 每日热量管理</div>
  </div>

  <!-- 热量目标条 -->
  <div class="calorie-bar">
    <div class="calorie-bar-emoji">🔥</div>
    <div class="calorie-bar-info">
      <div class="calorie-bar-label">今日摄入 / 目标</div>
      <div class="calorie-bar-values">
        {{ todayCalories }} / {{ dailyCalorieGoal }} kcal
        <span v-if="remainingCalories > 0" style="color:#4CAF50">(剩{{ remainingCalories }})</span>
        <span v-else style="color:#F44336">(超{{ -remainingCalories }})</span>
      </div>
      <div class="calorie-bar-progress">
        <div
          class="calorie-bar-fill"
          :class="calorieBarClass"
          :style="{ width: caloriePercent + '%' }"
        ></div>
      </div>
    </div>
    <div class="goal-actions">
      <button class="goal-btn" @click="openGoalInput">设置</button>
    </div>
  </div>

  <!-- 热量目标输入 -->
  <div v-if="showGoalInput" class="goal-input-row">
    <input
      v-model="goalInputValue"
      type="number"
      class="goal-input"
      placeholder="输入每日热量目标(kcal)"
      min="800"
      max="4000"
    />
    <button class="goal-save-btn" @click="saveGoal">保存</button>
  </div>

  <!-- 顶栏 Tab -->
  <div class="tab-bar">
    <button
      v-for="tab in [
        { key: 'picker', label: '🎲 吃什么', icon: '🎲' },
        { key: 'recipes', label: '📋 菜谱库', icon: '📋' },
        { key: 'plan', label: '📅 今日餐单', icon: '📅' },
      ]"
      :key="tab.key"
      class="tab"
      :class="{ active: activeTab === tab.key }"
      @click="activeTab = tab.key as any"
    >
      {{ tab.label }}
    </button>
  </div>

  <!-- 主内容区 -->
  <div class="main-content">
    <!-- ========== Tab1: 吃什么 (随机选) ========== -->
    <div v-if="activeTab === 'picker'">
      <!-- 分类筛选 -->
      <div class="category-filter">
        <button
          v-for="cat in (['all', 'breakfast', 'lunch', 'dinner', 'snack'] as MealCategory[])"
          :key="cat"
          class="cat-chip"
          :class="{ active: activeCategory === cat }"
          @click="activeCategory = cat; pickRandom()"
        >
          {{ CATEGORY_EMOJI[cat] }} {{ CATEGORY_LABELS[cat] }}
        </button>
      </div>

      <!-- 热量滑块 -->
      <div class="calorie-filter">
        <div class="calorie-filter-label">
          最高热量：<strong>{{ maxCalories }}</strong> kcal
        </div>
        <input
          v-model.number="maxCalories"
          type="range"
          min="100"
          max="600"
          step="10"
          class="calorie-filter-slider"
        />
      </div>

      <!-- 随机结果展示 -->
      <div class="picker-section">
        <div class="picker-title">🎲 帮你决定了！</div>
        <div class="picker-desc">
          {{ activeCategory === 'all' ? '不限餐类' : CATEGORY_LABELS[activeCategory] }} · ≤{{ maxCalories }}kcal
        </div>
        <div v-if="selectedRecipe" class="picker-result">
          <div class="picker-emoji">{{ selectedRecipe.emoji }}</div>
          <div class="picker-name">{{ selectedRecipe.name }}</div>
          <div class="picker-kcal">🔥 {{ selectedRecipe.calories }} kcal</div>
        </div>
        <div v-else class="picker-result">
          <div class="picker-emoji">😅</div>
          <div class="picker-name">没有符合条件的菜谱</div>
          <div class="picker-desc">试试提高热量上限或换个分类</div>
        </div>
        <button class="picker-btn" @click="pickRandom">
          🔄 再来一个
        </button>
        <div class="picker-actions">
          <button
            class="picker-secondary-btn"
            @click="selectedRecipe ? openDetail(selectedRecipe) : null"
            :disabled="!selectedRecipe"
          >
            📖 查看做法
          </button>
          <button
            class="picker-secondary-btn"
            @click="addToPlan(); pickRandom()"
            :disabled="!selectedRecipe"
          >
            ✅ 加入餐单
          </button>
        </div>
      </div>
    </div>

    <!-- ========== Tab2: 菜谱库 ========== -->
    <div v-if="activeTab === 'recipes'">
      <div class="category-filter">
        <button
          v-for="cat in (['all', 'breakfast', 'lunch', 'dinner', 'snack'] as MealCategory[])"
          :key="cat"
          class="cat-chip"
          :class="{ active: activeCategory === cat }"
          @click="activeCategory = cat"
        >
          {{ CATEGORY_EMOJI[cat] }} {{ CATEGORY_LABELS[cat] }}
        </button>
      </div>

      <div class="recipe-list">
        <div
          v-for="recipe in getRecipesByCategory(activeCategory)"
          :key="recipe.id"
          class="recipe-card"
          @click="openDetail(recipe)"
        >
          <div class="recipe-card-header">
            <div class="recipe-emoji">{{ recipe.emoji }}</div>
            <div class="recipe-info">
              <div class="recipe-name">{{ recipe.name }}</div>
              <div class="recipe-meta">
                <span>⏱ {{ recipe.time }}分钟</span>
                <span>{{ recipe.difficulty }}</span>
              </div>
            </div>
          </div>
          <div class="recipe-tags">
            <span
              v-for="tag in recipe.tags"
              :key="tag"
              class="recipe-tag"
              :class="{ hot: tag === '高蛋白' }"
            >
              {{ tag }}
            </span>
          </div>
          <div class="recipe-nutrition">
            <div class="nutrition-item">
              <div class="nutrition-value kcal">{{ recipe.calories }}</div>
              <div class="nutrition-label">kcal</div>
            </div>
            <div class="nutrition-item">
              <div class="nutrition-value">{{ recipe.protein }}g</div>
              <div class="nutrition-label">蛋白质</div>
            </div>
            <div class="nutrition-item">
              <div class="nutrition-value">{{ recipe.fat }}g</div>
              <div class="nutrition-label">脂肪</div>
            </div>
            <div class="nutrition-item">
              <div class="nutrition-value">{{ recipe.carbs }}g</div>
              <div class="nutrition-label">碳水</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== Tab3: 今日餐单 ========== -->
    <div v-if="activeTab === 'plan'">
      <div class="plan-section">
        <h2>📅 今日餐单</h2>
        <div class="plan-total">
          总计 {{ todayCalories }} kcal | 剩余 {{ remainingCalories > 0 ? remainingCalories : 0 }} kcal
        </div>

        <!-- 早餐 -->
        <div
          class="plan-meal-slot"
          :class="{ filled: dailyMeal.breakfast }"
          @click="dailyMeal.breakfast ? openDetail(dailyMeal.breakfast) : (activeTab = 'recipes', activeCategory = 'breakfast')"
        >
          <span class="plan-meal-label">🌅 早餐</span>
          <div class="plan-meal-content">
            <template v-if="dailyMeal.breakfast">
              <div class="plan-meal-name">{{ dailyMeal.breakfast.emoji }} {{ dailyMeal.breakfast.name }}</div>
              <div class="plan-meal-kcal">🔥 {{ dailyMeal.breakfast.calories }} kcal</div>
            </template>
            <span v-else style="color:#BDBDBD">点击选择早餐 →</span>
          </div>
          <button
            v-if="dailyMeal.breakfast"
            class="plan-meal-remove"
            @click.stop="removeFromPlan('breakfast')"
          >✕</button>
        </div>

        <!-- 午餐 -->
        <div
          class="plan-meal-slot"
          :class="{ filled: dailyMeal.lunch }"
          @click="dailyMeal.lunch ? openDetail(dailyMeal.lunch) : (activeTab = 'recipes', activeCategory = 'lunch')"
        >
          <span class="plan-meal-label">☀️ 午餐</span>
          <div class="plan-meal-content">
            <template v-if="dailyMeal.lunch">
              <div class="plan-meal-name">{{ dailyMeal.lunch.emoji }} {{ dailyMeal.lunch.name }}</div>
              <div class="plan-meal-kcal">🔥 {{ dailyMeal.lunch.calories }} kcal</div>
            </template>
            <span v-else style="color:#BDBDBD">点击选择午餐 →</span>
          </div>
          <button
            v-if="dailyMeal.lunch"
            class="plan-meal-remove"
            @click.stop="removeFromPlan('lunch')"
          >✕</button>
        </div>

        <!-- 晚餐 -->
        <div
          class="plan-meal-slot"
          :class="{ filled: dailyMeal.dinner }"
          @click="dailyMeal.dinner ? openDetail(dailyMeal.dinner) : (activeTab = 'recipes', activeCategory = 'dinner')"
        >
          <span class="plan-meal-label">🌙 晚餐</span>
          <div class="plan-meal-content">
            <template v-if="dailyMeal.dinner">
              <div class="plan-meal-name">{{ dailyMeal.dinner.emoji }} {{ dailyMeal.dinner.name }}</div>
              <div class="plan-meal-kcal">🔥 {{ dailyMeal.dinner.calories }} kcal</div>
            </template>
            <span v-else style="color:#BDBDBD">点击选择晚餐 →</span>
          </div>
          <button
            v-if="dailyMeal.dinner"
            class="plan-meal-remove"
            @click.stop="removeFromPlan('dinner')"
          >✕</button>
        </div>

        <!-- 加餐 -->
        <div style="margin-top:8px; font-size:14px; color:var(--text-secondary);">
          🍎 加餐
          <span v-if="dailyMeal.snacks.length === 0" style="color:#BDBDBD; margin-left:8px;">暂无加餐</span>
        </div>
        <div
          v-for="snack in dailyMeal.snacks"
          :key="snack.id"
          class="plan-meal-slot filled"
          @click="openDetail(snack)"
        >
          <span class="plan-meal-label">🍎</span>
          <div class="plan-meal-content">
            <div class="plan-meal-name">{{ snack.emoji }} {{ snack.name }}</div>
            <div class="plan-meal-kcal">🔥 {{ snack.calories }} kcal</div>
          </div>
          <button
            class="plan-meal-remove"
            @click.stop="removeFromPlan('snack', snack.id)"
          >✕</button>
        </div>
      </div>
    </div>
  </div>

  <!-- 详情弹窗 -->
  <Teleport to="body">
    <div v-if="showDetail && selectedRecipe" class="modal-overlay" @click.self="closeDetail">
      <div class="modal">
        <button class="modal-close" @click="closeDetail">✕</button>
        <div class="modal-emoji">{{ selectedRecipe.emoji }}</div>
        <div class="modal-name">{{ selectedRecipe.name }}</div>

        <!-- 营养详情 -->
        <div class="modal-nutrition-detail">
          <div class="nutri-box">
            <div class="nutri-box-value" style="color:var(--accent)">{{ selectedRecipe.calories }}</div>
            <div class="nutri-box-label">热量/kcal</div>
          </div>
          <div class="nutri-box">
            <div class="nutri-box-value" style="color:#E53935">{{ selectedRecipe.protein }}g</div>
            <div class="nutri-box-label">蛋白质</div>
          </div>
          <div class="nutri-box">
            <div class="nutri-box-value" style="color:#FF9800">{{ selectedRecipe.fat }}g</div>
            <div class="nutri-box-label">脂肪</div>
          </div>
          <div class="nutri-box">
            <div class="nutri-box-value" style="color:#2196F3">{{ selectedRecipe.carbs }}g</div>
            <div class="nutri-box-label">碳水</div>
          </div>
        </div>

        <!-- 食材 -->
        <div class="modal-section">
          <h3>🛒 食材</h3>
          <ul class="ingredient-list">
            <li v-for="ing in selectedRecipe.ingredients" :key="ing" class="ingredient-item">
              {{ ing }}
            </li>
          </ul>
        </div>

        <!-- 步骤 -->
        <div class="modal-section">
          <h3>👨‍🍳 做法</h3>
          <ol class="step-list">
            <li v-for="(step, i) in selectedRecipe.steps" :key="i" class="step-item">
              <span class="step-num">{{ i + 1 }}</span>
              <span>{{ step }}</span>
            </li>
          </ol>
        </div>

        <!-- 基本信息 -->
        <div class="modal-section" style="display:flex; gap:16px; font-size:13px; color:var(--text-secondary);">
          <span>⏱ {{ selectedRecipe.time }} 分钟</span>
          <span>📊 难度: {{ selectedRecipe.difficulty }}</span>
          <span>{{ selectedRecipe.category === 'breakfast' ? '🌅 早餐' :
                   selectedRecipe.category === 'lunch' ? '☀️ 午餐' :
                   selectedRecipe.category === 'dinner' ? '🌙 晚餐' : '🍎 加餐' }}</span>
        </div>

        <button class="add-to-plan-btn" @click="addToPlan">
          ➕ 加入今日餐单
        </button>
      </div>
    </div>
  </Teleport>
</template>
