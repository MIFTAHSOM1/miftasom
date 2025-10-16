import ArticleCard from './ArticleCard';
import { useEffect, useState } from 'react';
import { loadBlogPosts, type BlogPost } from '@/lib/contentLoader';
import { Link } from 'react-router-dom';
import { useTranslation } from '@/contexts/TranslationContext';

const ArticleGrid = () => {
  const { t, language } = useTranslation();
  const [articles, setArticles] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        console.log("Loading blog posts...");
        setLoading(true);
        setError(null);
        // Strictly load posts for current UI language to avoid cross-language mix
        const lang = (language === 'so' ? 'so' : 'en') as 'en' | 'so';
        const data = await loadBlogPosts(lang);
        console.log("Loaded articles:", data.length, data);
        if (mounted) {
          setArticles(data);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading blog posts:", err);
        if (mounted) {
          setError("Failed to load blog posts");
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [language]);

  const normalizeBaseKey = (slug: string): string => slug.replace(/-so$/i, '');

  const preferLanguageAndDedup = (items: BlogPost[], lang: string): BlogPost[] => {
    const byBase = new Map<string, BlogPost[]>();
    for (const p of items) {
      const baseFromTranslations = p.translations?.en || p.translations?.so;
      const baseKey = baseFromTranslations || normalizeBaseKey(p.slug);
      if (!byBase.has(baseKey)) byBase.set(baseKey, []);
      byBase.get(baseKey)!.push(p);
    }
    const selected: BlogPost[] = [];
    for (const [, group] of byBase.entries()) {
      const match = group.find(g => g.language === lang) || group[0];
      selected.push(match);
    }
    selected.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return selected;
  };

  const visibleArticles = preferLanguageAndDedup(articles, language);

  if (loading) {
    return (
      <section className="container mx-auto px-4 lg:px-6 py-8">
        <div className="text-center">
          <p className="text-text-secondary">{t('articles.loading')}</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="container mx-auto px-4 lg:px-6 py-8">
        <div className="text-center">
          <p className="text-red-500">Error: {error}</p>
        </div>
      </section>
    );
  }

  if (visibleArticles.length === 0) {
    return (
      <section className="container mx-auto px-4 lg:px-6 py-8">
        <div className="text-center">
          <p className="text-text-secondary">{t('articles.not-found')}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 lg:px-6">
      {/* Mobile: Al Jazeera Health Style - News List */}
      <div className="lg:hidden py-6">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900">{t('articles.more')}</h2>
          <Link to="/health" className="text-red-600 text-sm font-medium hover:underline">
            {t('articles.view-all')}
          </Link>
        </div>
        
        {/* Articles List - Al Jazeera Style */}
        <div className="space-y-4">
          {visibleArticles.map((article, index) => (
            <Link key={index} to={`/articles/${article.slug}`} className="block group">
              <div className="flex gap-3 pb-4 border-b border-gray-100 last:border-b-0">
                {/* Image */}
                <div className="flex-shrink-0">
                  <img 
                    src={article.image} 
                    alt={article.title}
                    className="w-20 h-20 object-cover rounded"
                  />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 mb-1 group-hover:text-red-600 transition-colors line-clamp-2 leading-tight">
                    {article.title}
                  </h3>
                  <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                    {article.excerpt}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {new Date(article.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                    <span className="text-xs text-red-600 font-medium">
                      {article.category}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Desktop: 3 Column Grid */}
      <div className="hidden lg:block py-8">
        <div className="grid grid-cols-3 gap-6">
          {visibleArticles.map((article, index) => (
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
    </section>
  );
};

export default ArticleGrid;