from django.contrib import admin
from .models import RecommendationResult, RecommendationRanking, EmbeddingCache


@admin.register(RecommendationResult)
class RecommendationResultAdmin(admin.ModelAdmin):
    list_display = ['user', 'query_text', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__username', 'query_text']
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('user', 'query_text')
        }),
        ('입력 컨텍스트', {
            'fields': ('input_context',),
            'classes': ('collapse',)
        }),
        ('추천 결과', {
            'fields': ('recommended_menu_ids', 'scores'),
            'classes': ('collapse',)
        }),
        ('생성 정보', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )


@admin.register(RecommendationRanking)
class RecommendationRankingAdmin(admin.ModelAdmin):
    list_display = ['recommendation', 'menu', 'rank']
    list_filter = ['rank']
    search_fields = ['recommendation__user__username', 'menu__name']
    
    fieldsets = (
        ('순위 정보', {
            'fields': ('recommendation', 'menu', 'rank')
        }),
    )


@admin.register(EmbeddingCache)
class EmbeddingCacheAdmin(admin.ModelAdmin):
    list_display = ['entity_type', 'entity_id', 'embedding_length']
    list_filter = ['entity_type']
    search_fields = ['entity_id']
    
    def embedding_length(self, obj):
        return len(obj.embedding) if obj.embedding else 0
    embedding_length.short_description = '임베딩 길이'
    
    fieldsets = (
        ('엔티티 정보', {
            'fields': ('entity_type', 'entity_id')
        }),
        ('임베딩 데이터', {
            'fields': ('embedding',),
            'classes': ('collapse',)
        }),
    )
