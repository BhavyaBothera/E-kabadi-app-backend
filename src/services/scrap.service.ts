import { supabaseAdmin } from '../config/supabase';
import { env } from '../config/env';
import { aiService } from '../integrations/ai/ai.service';
import { AnalyzeScrapInput } from '../validators/scrap.schemas';
import { ScrapAnalysisItem } from '../integrations/ai/ai.interface';

export interface CategoryPriceInfo {
  category: string;
  priceRange: string;
  iconName: string;
  popularItems: string[];
}

export class ScrapService {
  async getCategoryPrices(): Promise<CategoryPriceInfo[]> {
    if (env.SUPABASE_URL.includes('mock-project.supabase.co') || env.NODE_ENV === 'test') {
      return [
        {
          category: 'Plastic',
          priceRange: '₹35 - ₹60 / kg',
          iconName: 'bottle',
          popularItems: ['PET Bottles', 'Hard Plastic Containers', 'Milk Covers'],
        },
        {
          category: 'Paper & Cardboard',
          priceRange: '₹14 - ₹22 / kg',
          iconName: 'file-text',
          popularItems: ['Newspapers', 'Corrugated Boxes', 'Books & Notebooks'],
        },
        {
          category: 'Metal & Aluminium',
          priceRange: '₹45 - ₹220 / kg',
          iconName: 'anvil',
          popularItems: ['Beverage Cans', 'Iron Rods', 'Copper Wire'],
        },
        {
          category: 'E-Waste',
          priceRange: '₹80 - ₹450 / unit',
          iconName: 'cpu',
          popularItems: ['Old Smartphones', 'Motherboards', 'Laptops'],
        },
        {
          category: 'Electronics',
          priceRange: '₹150 - ₹900 / unit',
          iconName: 'tv',
          popularItems: ['Microwaves', 'Washing Machines', 'Refrigerators'],
        },
        {
          category: 'Appliances',
          priceRange: '₹200 - ₹1200 / unit',
          iconName: 'sparkles',
          popularItems: ['Air Conditioners', 'Inverter Batteries', 'Motors'],
        },
      ];
    }

    const { data: categories } = await supabaseAdmin
      .from('scrap_categories')
      .select('id, name, icon_name, unit')
      .eq('is_active', true);

    const { data: rates } = await supabaseAdmin
      .from('rate_cards')
      .select('category_id, sub_type, min_rate, max_rate, unit, popular_item')
      .eq('is_active', true);

    if (!categories || categories.length === 0) {
      // Fallback matching Flutter mock data if database is empty
      return [
        {
          category: 'Plastic',
          priceRange: '₹35 - ₹60 / kg',
          iconName: 'bottle',
          popularItems: ['PET Bottles', 'Hard Plastic Containers', 'Milk Covers'],
        },
        {
          category: 'Paper & Cardboard',
          priceRange: '₹14 - ₹22 / kg',
          iconName: 'file-text',
          popularItems: ['Newspapers', 'Corrugated Boxes', 'Books & Notebooks'],
        },
        {
          category: 'Metal & Aluminium',
          priceRange: '₹45 - ₹220 / kg',
          iconName: 'anvil',
          popularItems: ['Beverage Cans', 'Iron Rods', 'Copper Wire'],
        },
        {
          category: 'E-Waste',
          priceRange: '₹80 - ₹450 / unit',
          iconName: 'cpu',
          popularItems: ['Old Smartphones', 'Motherboards', 'Laptops'],
        },
        {
          category: 'Electronics',
          priceRange: '₹150 - ₹900 / unit',
          iconName: 'tv',
          popularItems: ['Microwaves', 'Washing Machines', 'Refrigerators'],
        },
        {
          category: 'Appliances',
          priceRange: '₹200 - ₹1200 / unit',
          iconName: 'sparkles',
          popularItems: ['Air Conditioners', 'Inverter Batteries', 'Motors'],
        },
      ];
    }

    return categories.map((cat) => {
      const catRates = rates?.filter((r) => r.category_id === cat.id) || [];
      const minPrice = catRates.length ? Math.min(...catRates.map((r) => parseFloat(r.min_rate))) : 10;
      const maxPrice = catRates.length ? Math.max(...catRates.map((r) => parseFloat(r.max_rate))) : 100;
      const popular = catRates.map((r) => r.sub_type).slice(0, 3);

      return {
        category: cat.name,
        priceRange: `₹${minPrice} - ₹${maxPrice} / ${cat.unit}`,
        iconName: cat.icon_name,
        popularItems: popular.length > 0 ? popular : ['Standard Recyclables'],
      };
    });
  }

  async getPopularItems(): Promise<ScrapAnalysisItem[]> {
    return [
      {
        id: 'POP-1',
        category: 'Plastic',
        subType: 'PET Bottles',
        weightKg: 1.0,
        pricePerKg: 50.0,
        estimatedTotal: 50.0,
        confidenceScore: 0.95,
        notes: 'Clean transparent bottles',
      },
      {
        id: 'POP-2',
        category: 'Paper & Cardboard',
        subType: 'Old Newspapers',
        weightKg: 5.0,
        pricePerKg: 18.0,
        estimatedTotal: 90.0,
        confidenceScore: 0.98,
        notes: 'Dry stacks of newspapers',
      },
      {
        id: 'POP-3',
        category: 'E-Waste',
        subType: 'Old Smartphone',
        weightKg: 0.3,
        pricePerKg: 850.0,
        estimatedTotal: 850.0,
        confidenceScore: 0.90,
        notes: 'Smart devices & chargers',
      },
    ];
  }

  async analyzeScrap(input: AnalyzeScrapInput, userId?: string): Promise<ScrapAnalysisItem[]> {
    const result = await aiService.analyzeScrapImage(input.image, userId, input.isFromCamera);
    return result.items;
  }
}

export const scrapService = new ScrapService();
