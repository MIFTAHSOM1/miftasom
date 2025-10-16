import { useEffect, useMemo, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import Layout from '@/components/Layout';
import ArticleCard from '@/components/ArticleCard';
import Sidebar from '@/components/Sidebar';
import { useTranslation } from '@/contexts/TranslationContext';
import heroHealthImage from '@/assets/hero-health-nutrition.jpg';
import heroParentingImage from '@/assets/hero-parenting.jpg';
import heroQuranImage from '@/assets/hero-quran.jpg';
import heroEducationImage from '@/assets/hero-education.jpg';
import heroBabyNamesImage from '@/assets/hero-baby-names.jpg';
import { loadBlogPosts, type BlogPost } from '@/lib/contentLoader';

const CategoryPage = () => {
  const { category } = useParams<{ category: string }>();
  const location = useLocation();
  const { t, language } = useTranslation();
  
  // Extract category from pathname if not in params
  const getCurrentCategory = () => {
    if (category) return category;
    const path = location.pathname.replace('/', '');
    return path || 'health';
  };
  
  const categoryInfo: Record<string, { title: string; description: string; image: string }> = {
    'parenting': {
      title: t('category.parenting.title'),
      description: t('category.parenting.description'),
      image: heroParentingImage
    },
    'baby-names': {
      title: t('category.baby-names.title'),
      description: t('category.baby-names.description'),
      image: heroBabyNamesImage
    },
    'education': {
      title: t('category.education.title'),
      description: t('category.education.description'),
      image: heroEducationImage
    },
    'quran': {
      title: t('category.quran.title'),
      description: t('category.quran.description'),
      image: heroQuranImage
    }
  };

  const currentCategory = getCurrentCategory();
  const info = categoryInfo[currentCategory] || {
    title: t('category.health.title'),
    description: t('category.health.description'),
    image: heroHealthImage
  };

  const [allPosts, setAllPosts] = useState<BlogPost[]>([]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      // Load only posts for current UI language to prevent mixed-language results
      const lang = (language === 'so' ? 'so' : 'en') as 'en' | 'so';
      const data = await loadBlogPosts(lang);
      if (mounted) setAllPosts(data);
    })();
    return () => {
      mounted = false;
    };
  }, [language]);

  const categoryArticles = useMemo(() => {
    // Normalize any localized category name to a stable route slug
    const nameToSlug = (name: string): string => {
      const n = name.trim().toLowerCase();
      const map: Record<string, string> = {
        'health': 'health',
        'caafimaad': 'health',
        'parenting': 'parenting',
        'barbaarinta carruurta': 'parenting',
        'education': 'education',
        'waxbarasho': 'education',
        'quran': 'quran',
        'quraanka': 'quran',
        'baby names': 'baby-names',
        'magacyada carruurta': 'baby-names',
      };
      return map[n] ?? n.replace(/\s+/g, '-');
    };

    const targetSlug = currentCategory;
    const filtered = allPosts.filter(p => nameToSlug(p.category) === targetSlug);

    // Group by base slug and prefer current UI language
    const normalizeBaseKey = (slug: string): string => slug.replace(/-so$/i, '');
    const byBase = new Map<string, BlogPost[]>();
    for (const p of filtered) {
      const baseFromTranslations = p.translations?.en || p.translations?.so;
      const baseKey = baseFromTranslations || normalizeBaseKey(p.slug);
      if (!byBase.has(baseKey)) byBase.set(baseKey, []);
      byBase.get(baseKey)!.push(p);
    }
    const selected: BlogPost[] = [];
    for (const [, group] of byBase.entries()) {
      const match = group.find(g => g.language === language) || group[0];
      selected.push(match);
    }
    selected.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return selected.length > 0 ? selected : allPosts;
  }, [allPosts, currentCategory, language]);

  return (
    <Layout>
      {/* Category Header */}
      <div className="bg-aljazeera-blue text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl">
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">{info.title}</h1>
            <p className="text-xl opacity-90 leading-relaxed">
              {info.description}
            </p>
          </div>
        </div>
      </div>

      {/* Articles Grid */}
      <div className="container mx-auto px-4 py-12">
        <div className="flex gap-8">
          {/* Main Content */}
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categoryArticles.map((article, index) => (
                <ArticleCard
                  key={index}
                  title={article.title}
                  excerpt={article.excerpt}
                  image={article.image}
                  category={article.category}
                  date={article.date}
                  href={`/articles/${article.slug}`}
                />
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="hidden xl:block">
            <Sidebar />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CategoryPage;