<template>
  <div class="flex min-w-0 items-start gap-2 text-sm leading-relaxed">
    <BookOpen class="mt-1 h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
    <div class="min-w-0">
      <template v-if="recipeId">
        <span class="block text-xs opacity-65">{{ t('brews.common.linked_recipe') }}</span>
        <router-link :to="`/oppskrifter/${encodeURIComponent(recipeId)}`" class="inline-flex max-w-full items-baseline gap-1.5 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" @click.stop>
          <span class="min-w-0 break-words underline decoration-border3 underline-offset-4 hover:decoration-current">{{ recipeName || t('brews.common.open_recipe') }}</span>
          <span v-if="version" class="shrink-0 rounded border border-border3 px-1.5 text-xs font-normal">v{{ version }}</span>
        </router-link>
      </template>
      <span v-else class="opacity-65">{{ t('brews.common.no_recipe') }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { BookOpen } from 'lucide-vue-next';
const props = defineProps({ brew: { type: Object, required: true } });
const { t } = useI18n();
const recipe = computed(() => props.brew.recipeSnapshot || {});
const linked = computed(() => recipe.value.recipeId || props.brew.recipeId);
const recipeId = computed(() => typeof linked.value === 'object' ? String(linked.value?._id || '') : String(linked.value || ''));
const recipeName = computed(() => recipe.value.name || (typeof linked.value === 'object' ? linked.value?.name : ''));
const version = computed(() => Number(recipe.value.recipeVersion) > 0 ? Number(recipe.value.recipeVersion) : null);
</script>
