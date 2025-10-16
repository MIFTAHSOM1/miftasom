// Content loader for Netlify CMS
export interface BlogPost {
  title: string;
  date: string;
  image: string;
  category: string;
  excerpt: string;
  author: string;
  readTime: string;
  language: string;
  slug: string;
  body: string;
  translations?: Record<string, string>;
}

export interface Category {
  title: string;
  description: string;
  image: string;
  color: string;
  slug: string;
}

export interface HomePage {
  title: string;
  description: string;
  heroTitle: string;
  heroExcerpt: string;
  heroImage: string;
}

// In a real implementation, you would fetch this from your CMS API
// For now, we'll use the static content we created
// Load blog posts. By default, returns posts of all languages to avoid hiding content
// when the UI language is toggled. Pass languageFilter to restrict if needed.
export const loadBlogPosts = async (languageFilter: 'en' | 'so' | 'all' = 'all'): Promise<BlogPost[]> => {
  console.log("=== Starting loadBlogPosts ===");
  console.log("Environment:", import.meta.env.MODE);
  console.log("Base URL:", import.meta.env.BASE_URL);
  
  // In production, prefer posts.json for reliability
  if (import.meta.env.PROD) {
    console.log("Production environment detected, using posts.json directly");
    return await loadPostsFromJson(languageFilter);
  }
  
  try {
    console.log("Development environment, trying dynamic imports...");
    
    // Try different glob patterns to find the files
    const files = import.meta.glob("../content/blog/**/*.md", { query: "?raw", import: "default" });
    const entries = Object.entries(files);
    console.log("Found blog files:", entries.length, entries.map(([path]) => path));
    
    if (entries.length === 0) {
      console.log("No blog files found, trying alternative pattern...");
      // Try alternative pattern
      const altFiles = import.meta.glob("./content/blog/**/*.md", { query: "?raw", import: "default" });
      const altEntries = Object.entries(altFiles);
      console.log("Alternative pattern found:", altEntries.length, altEntries.map(([path]) => path));
      
      if (altEntries.length === 0) {
        console.log("No files found with any pattern, trying posts.json fallback...");
        return await loadPostsFromJson(languageFilter);
      }
      
      // Use alternative entries
      entries.push(...altEntries);
    }

    const { default: matter } = await import("gray-matter");
    const { marked } = await import("marked");

    console.log("Processing", entries.length, "blog files...");

    const posts: BlogPost[] = await Promise.all(
      entries.map(async ([path, loader], index) => {
        try {
          console.log(`Processing file ${index + 1}/${entries.length}: ${path}`);
          const raw = await (loader as () => Promise<string>)();
          const parsed = matter(raw);
          const data = parsed.data as Partial<BlogPost> & { date?: string };
          const body = marked.parse(parsed.content.trim());

          const fileName = path.split("/").pop() || "";
          const withoutExt = fileName.replace(/\.md$/i, "");
          // If filename starts with YYYY-MM-DD-, strip the date for slug
          const slug = withoutExt.replace(/^\d{4}-\d{2}-\d{2}-/, "");

          // Infer language when missing based on filename suffix and Somali category labels
          const categoryValue = (data.category as string | undefined) ?? "General";
          const isSomaliCategory = [
            "Caafimaad",
            "Barbaarinta Carruurta",
            "Waxbarasho",
            "Quraanka",
            "Magacyada Carruurta",
          ].some(label => label.toLowerCase() === categoryValue.toLowerCase());
          const hasSomaliFilename = /(^|-)so$/i.test(withoutExt);
          const inferredLanguage = (data as { language?: string } | undefined)?.language
            ?? (hasSomaliFilename || isSomaliCategory ? "so" : "en");

          const post = {
            title: data.title ?? slug,
            date: data.date ?? new Date().toISOString().slice(0, 10),
            image: data.image ?? "/images/placeholder.svg",
            category: categoryValue,
            excerpt: data.excerpt ?? "",
            author: data.author ?? "",
            readTime: data.readTime ?? "",
            language: inferredLanguage,
            slug,
            body,
            translations: (data as any).translations as Record<string, string> | undefined
          } as BlogPost;
          
          console.log(`Successfully processed: ${post.title}`);
          return post;
        } catch (fileError) {
          console.error(`Error processing file ${path}:`, fileError);
          // Return a fallback post instead of failing completely
          return {
            title: `Error loading post ${index + 1}`,
            date: new Date().toISOString().slice(0, 10),
            image: "/images/placeholder.svg",
            category: "General",
            excerpt: "There was an error loading this post.",
            author: "System",
            readTime: "1 min read",
            language: "en",
            slug: `error-${index}`,
            body: "<p>Error loading content</p>"
          } as BlogPost;
        }
      })
    );

    console.log("Successfully processed", posts.length, "posts");
    
    // Filter posts by language
    const finalPosts = languageFilter === 'all' 
      ? posts 
      : posts.filter(post => post.language === languageFilter);
    console.log(`Posts after language filter (${languageFilter}): ${finalPosts.length}`);
    
    finalPosts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return finalPosts;
  } catch (error) {
    console.error("Error in loadBlogPosts:", error);
    console.log("Falling back to posts.json...");
    return await loadPostsFromJson(languageFilter);
  }
};

// Fallback function to load posts from the generated posts.json file
const loadPostsFromJson = async (languageFilter: 'en' | 'so' | 'all' = 'all'): Promise<BlogPost[]> => {
  try {
    console.log("Loading posts from posts.json...");
    console.log("Current URL:", window.location.href);
    console.log("Fetching from:", "/posts.json");
    
    const response = await fetch("/posts.json");
    console.log("Response status:", response.status);
    console.log("Response ok:", response.ok);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch posts.json: ${response.status} ${response.statusText}`);
    }
    
    const postsData = await response.json();
    console.log("Successfully loaded", postsData.length, "posts from posts.json");
    console.log("First post:", postsData[0]);
    
    // Convert the JSON data to BlogPost format
    const posts: BlogPost[] = postsData.map((post: any) => ({
      title: post.title,
      date: post.date,
      image: post.image,
      category: post.category,
      excerpt: post.excerpt,
      author: post.author,
      readTime: post.readTime,
      language: post.language,
      slug: post.slug,
      body: post.html // The JSON contains 'html' instead of 'body'
    }));
    
    console.log("Converted posts:", posts.length);
    
    // Filter posts by language
    const finalPosts = languageFilter === 'all' 
      ? posts 
      : posts.filter(post => post.language === languageFilter);
    console.log(`Posts after language filter (${languageFilter}): ${finalPosts.length}`);
    
    return finalPosts;
  } catch (error) {
    console.error("Error loading posts from posts.json:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    // Return empty array as final fallback
    return [];
  }
};

export const loadCategories = async (): Promise<Category[]> => {
  return [
    {
      title: "Health",
      description: "Comprehensive health information, nutrition guidance, and wellness tips for the whole family.",
      image: "/images/hero-health-nutrition.jpg",
      color: "#10B981",
      slug: "health"
    },
    {
      title: "Parenting",
      description: "Expert guidance for raising healthy, happy children with Islamic values and modern parenting wisdom.",
      image: "/images/hero-parenting.jpg",
      color: "#8B5CF6",
      slug: "parenting"
    },
    {
      title: "Baby Names",
      description: "Beautiful Somali, Arabic, and Islamic names with meaningful origins and cultural significance.",
      image: "/images/hero-baby-names.jpg",
      color: "#EC4899",
      slug: "baby-names"
    },
    {
      title: "Education",
      description: "Educational insights, learning strategies, and academic guidance for students and families.",
      image: "/images/hero-education.jpg",
      color: "#3B82F6",
      slug: "education"
    },
    {
      title: "Quran Studies",
      description: "Islamic education, Quranic studies, and spiritual guidance for modern Muslim families.",
      image: "/images/hero-quran.jpg",
      color: "#10B981",
      slug: "quran"
    }
  ];
};

export const loadHomePage = async (): Promise<HomePage> => {
  return {
    title: "Miftah Som Academy - Health, Parenting, Education & Islamic Studies",
    description: "Empowering families with knowledge about health, parenting, education, and Islamic values through evidence-based content and cultural wisdom.",
    heroTitle: "Essential Nutrition Guide: Building Healthy Eating Habits for the Whole Family",
    heroExcerpt: "Discover comprehensive strategies for maintaining optimal health through balanced nutrition, including practical meal planning tips and evidence-based dietary recommendations that work for busy families.",
    heroImage: "/images/hero-health-nutrition.jpg"
  };
};
