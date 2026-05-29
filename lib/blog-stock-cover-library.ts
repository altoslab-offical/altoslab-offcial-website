export type StockCover = {
  url: string;
  credit: string;
  creditUrl: string;
  license: string;
  licenseUrl: string;
  provider: string;
  tags: string[];
};

function stockCover(url: string, credit: string, tags: string[]): StockCover {
  const isPexels = url.includes("images.pexels.com");
  return {
    url,
    credit,
    creditUrl: isPexels ? "https://www.pexels.com" : "https://unsplash.com",
    license: isPexels ? "Pexels License" : "Unsplash License",
    licenseUrl: isPexels ? "https://www.pexels.com/license/" : "https://unsplash.com/license",
    provider: isPexels ? "pexels-library" : "unsplash-library",
    tags
  };
}

export const FREE_STOCK_COVER_LIBRARY: StockCover[] = [
  stockCover("https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80", "Developer workflow screen photo via Unsplash", ["product", "automation", "software", "agent"]),
  stockCover("https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80", "Server infrastructure photo via Unsplash", ["infra", "data", "model", "governance"]),
  stockCover("https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80", "Circuit board macro photo via Unsplash", ["infra", "model", "technology", "product"]),
  stockCover("https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80", "Analytics dashboard photo via Unsplash", ["geo", "search", "data", "governance"]),
  stockCover("https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80", "Modern studio workspace photo via Unsplash", ["product", "industry", "workflow", "studio"]),
  stockCover("https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80", "Robotics lab photo via Unsplash", ["agents", "automation", "robotics", "industry"]),
  stockCover("https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80", "Product team laptop workspace photo via Unsplash", ["product", "workflow", "team", "startup"]),
  stockCover("https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80", "Technology planning workspace photo via Unsplash", ["column", "product", "strategy", "workflow"]),
  stockCover("https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=1200&q=80", "Data and research desk photo via Unsplash", ["geo", "data", "research", "governance"]),
  stockCover("https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80", "Business analytics laptop photo via Unsplash", ["geo", "growth", "data", "business"]),
  stockCover("https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80", "Cybersecurity hardware photo via Unsplash", ["governance", "security", "infra", "risk"]),
  stockCover("https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80", "Code matrix screen photo via Unsplash", ["infra", "software", "agent", "automation"]),
  stockCover("https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=1200&q=80", "Laptop product build photo via Unsplash", ["product", "software", "build", "workflow"]),
  stockCover("https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?auto=format&fit=crop&w=1200&q=80", "Network hardware photo via Unsplash", ["infra", "network", "model", "data"]),
  stockCover("https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80", "Earth network visualization photo via Unsplash", ["geo", "search", "platform", "trend"]),
  stockCover("https://images.unsplash.com/photo-1518186285589-2f7649de83e0?auto=format&fit=crop&w=1200&q=80", "Data stream visualization photo via Unsplash", ["data", "geo", "automation", "trend"]),
  stockCover("https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80", "Code editor workspace photo via Unsplash", ["software", "product", "agent", "build"]),
  stockCover("https://images.unsplash.com/photo-1484417894907-623942c8ee29?auto=format&fit=crop&w=1200&q=80", "Laptop coding desk photo via Unsplash", ["software", "automation", "workflow", "product"]),
  stockCover("https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80", "Terminal code close-up photo via Unsplash", ["software", "infra", "agent", "automation"]),
  stockCover("https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80", "Laptop development close-up photo via Unsplash", ["software", "build", "agent", "product"]),
  stockCover("https://images.unsplash.com/photo-1526378722484-bd91ca387e72?auto=format&fit=crop&w=1200&q=80", "Research laptop workspace photo via Unsplash", ["research", "geo", "workflow", "strategy"]),
  stockCover("https://images.unsplash.com/photo-1550439062-609e1531270e?auto=format&fit=crop&w=1200&q=80", "Technology lab hardware photo via Unsplash", ["infra", "automation", "robotics", "model"]),
  stockCover("https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=1200&q=80", "Machine learning code photo via Unsplash", ["agent", "software", "model", "automation"]),
  stockCover("https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80", "Digital security keyboard photo via Unsplash", ["governance", "security", "risk", "infra"]),
  stockCover("https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1200&q=80", "Architecture geometry photo via Unsplash", ["feature", "framework", "strategy", "system"]),
  stockCover("https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?auto=format&fit=crop&w=1200&q=80", "Engineering prototype photo via Unsplash", ["product", "automation", "prototype", "industry"]),
  stockCover("https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=1200&q=80", "Industrial control workspace photo via Unsplash", ["industry", "automation", "workflow", "governance"]),
  stockCover("https://images.unsplash.com/photo-1581090700227-1e37b190418e?auto=format&fit=crop&w=1200&q=80", "Engineering robotics detail photo via Unsplash", ["agents", "robotics", "automation", "industry"]),
  stockCover("https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80", "Collaborative workspace photo via Unsplash", ["workflow", "product", "industry", "strategy"]),
  stockCover("https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1200&q=80", "Startup product team photo via Unsplash", ["product", "team", "workflow", "startup"]),
  stockCover("https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80", "Team planning workspace photo via Unsplash", ["workflow", "governance", "strategy", "industry"]),
  stockCover("https://images.unsplash.com/photo-1560264280-88b68371db39?auto=format&fit=crop&w=1200&q=80", "Business operations desk photo via Unsplash", ["industry", "governance", "operations", "strategy"]),
  stockCover("https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&q=80", "Planning boardroom photo via Unsplash", ["strategy", "governance", "workflow", "business"]),
  stockCover("https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80", "Creative business workshop photo via Unsplash", ["column", "workflow", "product", "strategy"]),
  stockCover("https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg?auto=compress&cs=tinysrgb&w=1200", "Programming workspace photo via Pexels", ["software", "agent", "automation", "product"]),
  stockCover("https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg?auto=compress&cs=tinysrgb&w=1200", "Laptop coding photo via Pexels", ["software", "product", "build", "agent"]),
  stockCover("https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=1200", "Developer screen photo via Pexels", ["software", "automation", "infra", "product"]),
  stockCover("https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1200", "Operational planning table photo via Pexels", ["workflow", "strategy", "governance", "industry"]),
  stockCover("https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=1200", "AI robotics lab photo via Pexels", ["agents", "robotics", "automation", "industry"]),
  stockCover("https://images.pexels.com/photos/3862132/pexels-photo-3862132.jpeg?auto=compress&cs=tinysrgb&w=1200", "Engineering automation photo via Pexels", ["automation", "industry", "robotics", "infra"]),
  stockCover("https://images.pexels.com/photos/325229/pexels-photo-325229.jpeg?auto=compress&cs=tinysrgb&w=1200", "Data center corridor photo via Pexels", ["infra", "data", "server", "model"]),
  stockCover("https://images.pexels.com/photos/6476589/pexels-photo-6476589.jpeg?auto=compress&cs=tinysrgb&w=1200", "Abstract data interface photo via Pexels", ["data", "geo", "platform", "trend"]),
  stockCover("https://images.pexels.com/photos/6476254/pexels-photo-6476254.jpeg?auto=compress&cs=tinysrgb&w=1200", "Digital dashboard photo via Pexels", ["geo", "data", "analytics", "growth"]),
  stockCover("https://images.pexels.com/photos/8386434/pexels-photo-8386434.jpeg?auto=compress&cs=tinysrgb&w=1200", "AI interface photo via Pexels", ["agent", "product", "automation", "model"]),
  stockCover("https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=1200", "Machine intelligence visual photo via Pexels", ["model", "agent", "trend", "product"])
];
