from django.contrib import admin
from .models import Restaurant, RestaurantMenu


@admin.register(Restaurant)
class RestaurantAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'address', 'phone', 'source', 'created_at']
    list_filter = ['created_at', 'source']
    search_fields = ['name', 'address', 'phone', 'source']
    readonly_fields = ['created_at']
    ordering = ['-created_at']
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('name', 'address', 'phone', 'source')
        }),
        ('위치 정보', {
            'fields': ('latitude', 'longitude'),
            'classes': ('collapse',)
        }),
        ('이미지', {
            'fields': ('image_url',),
            'classes': ('collapse',)
        }),
        ('생성 정보', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )


@admin.register(RestaurantMenu)
class RestaurantMenuAdmin(admin.ModelAdmin):
    list_display = ['restaurant', 'menu']
    list_filter = ['restaurant', 'menu']
    search_fields = ['restaurant__name', 'menu__name']
    
    fieldsets = (
        ('연결 정보', {
            'fields': ('restaurant', 'menu')
        }),
    )
