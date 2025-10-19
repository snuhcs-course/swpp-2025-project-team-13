from django.contrib import admin
from .models import Menu, MenuCandidate


@admin.register(Menu)
class MenuAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'tag_name']
    list_filter = ['category', 'tag_name']
    search_fields = ['name', 'description', 'tag_name']
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('name', 'category', 'description', 'tag_name')
        }),
        ('이미지 및 임베딩', {
            'fields': ('image_url', 'embedding'),
            'classes': ('collapse',)
        }),
    )


@admin.register(MenuCandidate)
class MenuCandidateAdmin(admin.ModelAdmin):
    list_display = ['name', 'restaurant', 'price', 'created_at']
    list_filter = ['restaurant', 'created_at']
    search_fields = ['name', 'restaurant__name']
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('restaurant', 'name', 'price')
        }),
        ('이미지 및 임베딩', {
            'fields': ('image_url', 'embedding'),
            'classes': ('collapse',)
        }),
        ('생성 정보', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
