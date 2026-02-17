"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import { employeeAPI } from "@/services/apiService";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface Block {
  id: string;
  type: "text" | "image" | "heading" | "hero";
  content: string;
  position?: {
    x: number;
    y: number;
  };
  size?: {
    width: number;
    height: number;
  };
  style?: {
    fontSize?: string;
    fontWeight?: string;
    color?: string;
    backgroundColor?: string;
    textAlign?: string;
  };
}

interface AboutUsData {
  blocks: Block[];
  pageBackgroundColor?: string;
}

interface Employee {
  _id: string;
  name: string;
  position: string;
  yearsOfExperience: number;
  imageUrl?: string;
  bio?: string;
  status: "active" | "inactive";
}

export default function AboutPage() {
  const [aboutUs, setAboutUs] = useState<AboutUsData | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchAboutUs = useCallback(async () => {
    try {
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await fetch(`${API_URL}/about-us?t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      
      if (!response.ok) {
        // 404 means no data exists yet, which is fine - show fallback
        if (response.status === 404) {
          console.log("No About Us content found, showing default content");
          setAboutUs(null);
          setError(false);
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("📄 Fetched About Us data:", data);
      
      if (data.success && data.data) {
        console.log("📄 Setting About Us data with", data.data.blocks?.length, "blocks");
        setAboutUs(data.data);
        setError(false);
      } else {
        setAboutUs(null);
      }
    } catch (error) {
      console.error("Error fetching about us:", error);
      setError(true);
      setAboutUs(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await employeeAPI.getActiveEmployees();
      setEmployees(response.data);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    if (isMounted) {
      fetchAboutUs();
      fetchEmployees();
    }
    
    return () => {
      isMounted = false;
    };
  }, [fetchAboutUs]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  // Helper function to get text content by block ID
  const getBlockContent = (blockId: string, defaultContent: string): string => {
    if (!aboutUs?.blocks) return defaultContent;
    const block = aboutUs.blocks.find(b => b.id === blockId);
    return block?.content || defaultContent;
  };

  // ALWAYS render the structured layout with images and design
  // Only inject admin-editable text content where specified
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hero Section - Structure is fixed, only text is editable */}
      <section className="relative min-h-[80vh] flex items-center justify-start overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-linear-to-r from-black/80 via-black/60 to-transparent z-10"></div>
          <img 
            src="/pic1.png" 
            alt="Business Management" 
            className="w-full h-full object-cover"
          />
        </div>
        {/* Content */}
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-3xl">
            <h1 
              className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight"
              dangerouslySetInnerHTML={{ 
                __html: getBlockContent('heading-1', 'All-in-One Platform for Better Management')
              }}
            />
            <div 
              className="text-xl md:text-2xl text-gray-200 mb-10 leading-relaxed"
              dangerouslySetInnerHTML={{ 
                __html: getBlockContent('text-1', 'Streamline your business operations with our comprehensive ERP solution. Manage inventory, orders, customers, and more from a single, intuitive platform.')
              }}
            />
          </div>
        </div>
      </section>

      {/* Features Section - Structure with icons is fixed, only text is editable */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <h2 
            className="text-4xl md:text-5xl font-bold text-center text-gray-900 dark:text-white mb-16"
            dangerouslySetInnerHTML={{ 
              __html: getBlockContent('heading-2', 'Powerful Features for Your Business')
            }}
          />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature Card 1 - Inventory */}
            <div className="p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-14 h-14 bg-linear-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div dangerouslySetInnerHTML={{ 
                __html: getBlockContent('text-2', '<h3 style="font-size: 24px; font-weight: bold; margin-bottom: 16px; color: #ffffff;">Inventory Management</h3><p style="color: #d1d5db;">Track stock levels, manage products with variations, and get real-time inventory updates</p>')
              }} />
            </div>

            {/* Feature Card 2 - Orders */}
            <div className="p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-14 h-14 bg-linear-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div dangerouslySetInnerHTML={{ 
                __html: getBlockContent('text-3', '<h3 style="font-size: 24px; font-weight: bold; margin-bottom: 16px; color: #ffffff;">Order Processing</h3><p style="color: #d1d5db;">Streamline order management from creation to fulfillment with automated workflows</p>')
              }} />
            </div>

            {/* Feature Card 3 - Customers */}
            <div className="p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-14 h-14 bg-linear-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div dangerouslySetInnerHTML={{ 
                __html: getBlockContent('text-4', '<h3 style="font-size: 24px; font-weight: bold; margin-bottom: 16px; color: #ffffff;">Customer Management</h3><p style="color: #d1d5db;">Maintain detailed customer profiles and track purchase history for better relationships</p>')
              }} />
            </div>

            {/* Feature Card 4 - Analytics */}
            
          </div>
        </div>
      </section>

      {/* Why Choose Section - Structure is fixed, only text is editable */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Why Choose MiniERP?
              </h2>
              <div
                className="prose prose-lg prose-invert **:text-white"
                dangerouslySetInnerHTML={{ 
                __html: getBlockContent('text-5', '<h3 style="font-size: 24px; font-weight: bold; margin-bottom: 16px; color: #ffffff;">Analytics & Reports</h3><p style="color: #ffffff;">Gain insights with comprehensive dashboards and detailed business analytics</p>')
              }}
              />
            </div>
            <div className="relative">
              <div className="aspect-square bg-linear-to-br from-blue-500 to-purple-600 rounded-3xl opacity-20 absolute inset-0 blur-3xl"></div>
              <div className="relative bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl">
                <div className="space-y-4">
                  <div className="h-4 bg-linear-to-r from-blue-500 to-purple-600 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
                  <div className="grid grid-cols-2 gap-4 pt-6">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">500+</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Active Users</div>
                    </div>
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                      <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">99.9%</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Uptime</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Structure is fixed, only text is editable */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-linear-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <div dangerouslySetInnerHTML={{ 
            __html: getBlockContent('text-9', '<h2 style="font-size: 40px; font-weight: bold; color: #ffffff; margin-bottom: 16px;">Ready to Transform Your Business?</h2><p style="font-size: 20px; color: #dbeafe; margin-bottom: 24px;">Join hundreds of businesses already using MiniERP to streamline their operations</p>')
          }} />
          <Link
            href="/login"
            className="inline-block px-8 py-4 bg-white text-blue-600 text-lg font-semibold rounded-full hover:shadow-2xl hover:scale-105 transition-all duration-300"
          >
            Get Started Today
          </Link>
        </div>
      </section>

      {/* Our Team Section */}
      {employees.length > 0 && (
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
                Meet Our Team
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                The talented people behind our success
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {employees.map((employee) => (
                <div
                  key={employee._id}
                  className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                >
                  <div className="aspect-square relative overflow-hidden">
                    {employee.imageUrl ? (
                      <img
                        src={employee.imageUrl}
                        alt={employee.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-4xl font-bold text-white">
                          {employee.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1 line-clamp-1">
                      {employee.name}
                    </h3>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-2 line-clamp-1">
                      {employee.position}
                    </p>
                    <div className="flex items-center text-xs text-gray-600 dark:text-gray-400 mb-2">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {employee.yearsOfExperience} {employee.yearsOfExperience === 1 ? 'yr' : 'yrs'}
                    </div>
                    {employee.bio && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                        {employee.bio}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
//   // OLD CODE BELOW - Keep for reference but not used
//   if (false && aboutUs && aboutUs.blocks && aboutUs.blocks.length > 0) {
//     // Check if blocks are text-only format (no position data or all positions are 0,0)
//     // This distinguishes between old absolute-positioned layout and new text-only layout
//     const firstBlock = aboutUs.blocks[0];
//     const isTextOnlyFormat = !firstBlock?.position || 
//                              (firstBlock.position.x === 0 && 
//                               firstBlock.position.y === 0 &&
//                               aboutUs.blocks.every(b => !b.position || (b.position.x === 0 && b.position.y === 0)));

//     console.log("📄 Rendering blocks:", {
//       blockCount: aboutUs.blocks.length,
//       isTextOnlyFormat,
//       firstBlockPosition: firstBlock?.position
//     });

//     if (isTextOnlyFormat) {
//       // Render text-only blocks in modern layout
//       return (
//         <div className="min-h-screen" style={{ backgroundColor: aboutUs.pageBackgroundColor || "#111827" }}>
//           {/* Content */}
//           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
//             <div className="space-y-12">
//               {(() => {
//                 const renderedBlocks: JSX.Element[] = [];
//                 let i = 0;
                
//                 while (i < aboutUs.blocks.length) {
//                   const block = aboutUs.blocks[i];
                  
//                   // Check if this is a feature card (background #374151)
//                   if (block.type === "text" && 
//                       block.style?.backgroundColor === "#374151" && 
//                       i < aboutUs.blocks.length - 1 &&
//                       aboutUs.blocks[i + 1]?.type === "text" &&
//                       aboutUs.blocks[i + 1]?.style?.backgroundColor === "#374151") {
                    
//                     // Collect consecutive feature cards
//                     const featureCards: typeof aboutUs.blocks = [];
//                     while (i < aboutUs.blocks.length && 
//                            aboutUs.blocks[i]?.type === "text" && 
//                            aboutUs.blocks[i]?.style?.backgroundColor === "#374151") {
//                       featureCards.push(aboutUs.blocks[i]);
//                       i++;
//                     }
                    
//                     // Render feature cards in grid
//                     renderedBlocks.push(
//                       <div key={`grid-${featureCards[0].id}`} className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
//                         {featureCards.map((card) => (
//                           <div
//                             key={card.id}
//                             className="transition-all duration-300 hover:-translate-y-2"
//                           >
//                             <div
//                               style={{
//                                 fontSize: card.style?.fontSize,
//                                 fontWeight: card.style?.fontWeight,
//                                 color: card.style?.color,
//                                 textAlign: card.style?.textAlign as any,
//                               }}
//                               dangerouslySetInnerHTML={{ __html: card.content }}
//                             />
//                           </div>
//                         ))}
//                       </div>
//                     );
//                   } else {
//                     // Render single block
//                     renderedBlocks.push(
//                       <div
//                         key={block.id}
//                         className={block.style?.backgroundColor && block.style.backgroundColor !== "transparent" ? "p-6 rounded-xl" : ""}
//                         style={{
//                           backgroundColor: block.style?.backgroundColor !== "transparent" 
//                             ? block.style?.backgroundColor 
//                             : undefined,
//                         }}
//                       >
//                         {block.type === "heading" ? (
//                           <h2
//                             style={{
//                               fontSize: block.style?.fontSize,
//                               fontWeight: block.style?.fontWeight,
//                               color: block.style?.color,
//                               textAlign: block.style?.textAlign as any,
//                             }}
//                           >
//                             {block.content}
//                           </h2>
//                         ) : (
//                           <div
//                             style={{
//                               fontSize: block.style?.fontSize,
//                               fontWeight: block.style?.fontWeight,
//                               color: block.style?.color,
//                               textAlign: block.style?.textAlign as any,
//                             }}
//                             dangerouslySetInnerHTML={{ __html: block.content }}
//                           />
//                         )}
//                       </div>
//                     );
//                     i++;
//                   }
//                 }
                
//                 return renderedBlocks;
//               })()}
//             </div>
//           </div>

//           {/* Footer */}
//           <footer className="border-t border-gray-800 text-white py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: aboutUs.pageBackgroundColor || "#111827" }}>
//             <div className="max-w-7xl mx-auto">
//               <div className="grid md:grid-cols-4 gap-8">
//                 <div>
//                   <span className="text-2xl font-bold bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
//                     MiniERP
//                   </span>
//                   <p className="mt-4 text-gray-400">
//                     Complete business management solution for modern enterprises
//                   </p>
//                 </div>
//                 <div>
//                   <h3 className="font-semibold mb-4">Product</h3>
//                   <ul className="space-y-2 text-gray-400">
//                     <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
//                     <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
//                   </ul>
//                 </div>
//                 <div>
//                   <h3 className="font-semibold mb-4">Company</h3>
//                   <ul className="space-y-2 text-gray-400">
//                     <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
//                     <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
//                     <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
//                   </ul>
//                 </div>
//                 <div>
//                   <h3 className="font-semibold mb-4">Legal</h3>
//                   <ul className="space-y-2 text-gray-400">
//                     <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
//                     <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
//                     <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
//                   </ul>
//                 </div>
//               </div>
//               <div className="mt-12 pt-8 border-t border-gray-800 text-center text-gray-400">
//                 <p>&copy; 2026 MiniERP. All rights reserved.</p>
//               </div>
//             </div>
//           </footer>
//         </div>
//       );
//     }

//     // Old format with absolute positioning
//     return (
//       <div 
//         className="min-h-screen" 
//         style={{ backgroundColor: aboutUs.pageBackgroundColor || "#ffffff" }}
//       >
//         {/* Render blocks */}
//         <div className="relative" style={{ minHeight: "100vh" }}>
//           {aboutUs.blocks.map((block) => (
//             <div
//               key={block.id}
//               className="absolute"
//               style={{
//                 left: `${block.position?.x || 0}px`,
//                 top: `${block.position?.y || 0}px`,
//                 width: `${block.size?.width || 300}px`,
//                 minHeight: `${block.size?.height || 100}px`,
//                 backgroundColor: block.style?.backgroundColor,
//               }}
//             >
//               {block.type === "text" && (
//                 <div
//                   className="p-4 h-full overflow-auto"
//                   style={{
//                     fontSize: block.style?.fontSize,
//                     fontWeight: block.style?.fontWeight,
//                     color: block.style?.color,
//                     textAlign: block.style?.textAlign as any,
//                   }}
//                   dangerouslySetInnerHTML={{ __html: block.content }}
//                 />
//               )}
//               {block.type === "heading" && (
//                 <div
//                   className="p-4 h-full flex items-center"
//                   style={{
//                     fontSize: block.style?.fontSize,
//                     fontWeight: block.style?.fontWeight,
//                     color: block.style?.color,
//                     textAlign: block.style?.textAlign as any,
//                   }}
//                 >
//                   {block.content}
//                 </div>
//               )}
//               {block.type === "hero" && (
//                 <div
//                   className="p-8 h-full flex flex-col justify-center relative overflow-hidden"
//                   style={{
//                     backgroundImage: block.content.startsWith("http") ? `url(${block.content})` : "none",
//                     backgroundSize: "cover",
//                     backgroundPosition: "center",
//                   }}
//                 >
//                   <div className="relative z-10">
//                     <h1
//                       style={{
//                         fontSize: block.style?.fontSize,
//                         fontWeight: block.style?.fontWeight,
//                         color: block.style?.color,
//                       }}
//                     >
//                       Hero Section
//                     </h1>
//                   </div>
//                 </div>
//               )}
//               {block.type === "image" && block.content && (
//                 <img src={block.content} alt="Content" className="w-full h-full object-cover" />
//               )}
//             </div>
//           ))}
//         </div>

//         {/* Footer */}
//         <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8 relative" style={{ marginTop: "2000px" }}>
//           <div className="max-w-7xl mx-auto">
//             <div className="grid md:grid-cols-4 gap-8">
//               <div>
//                 <span className="text-2xl font-bold bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
//                   MiniERP
//                 </span>
//                 <p className="mt-4 text-gray-400">
//                   Complete business management solution for modern enterprises
//                 </p>
//               </div>
//               <div>
//                 <h3 className="font-semibold mb-4">Product</h3>
//                 <ul className="space-y-2 text-gray-400">
//                   <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
//                   <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
//                 </ul>
//               </div>
//               <div>
//                 <h3 className="font-semibold mb-4">Company</h3>
//                 <ul className="space-y-2 text-gray-400">
//                   <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
//                   <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
//                   <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
//                 </ul>
//               </div>
//               <div>
//                 <h3 className="font-semibold mb-4">Legal</h3>
//                 <ul className="space-y-2 text-gray-400">
//                   <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
//                   <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
//                   <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
//                 </ul>
//               </div>
//             </div>
//             <div className="mt-12 pt-8 border-t border-gray-800 text-center text-gray-400">
//               <p>&copy; 2026 MiniERP. All rights reserved.</p>
//             </div>
//           </div>
//         </footer>
//       </div>
//     );
//   }

//   // Fallback content if no blocks exist
//   return (
//     <div className="min-h-screen bg-gray-900">
//       {/* About Us Header */}
//       <section className="pt-3 pb-2 px-4 sm:px-6 lg:px-8 bg-gray-900">
//         <div className="max-w-7xl mx-auto text-center">
//           <h1 className="text-4xl md:text-3xl font-bold text-white">
//             About Us
//           </h1>
//         </div>
//       </section>

//       {/* Hero Section */}
//       <section className="relative h-screen flex items-center justify-start overflow-hidden">
//         {/* Background Image with Overlay */}
//         <div className="absolute inset-0 z-0">
//           <div className="absolute inset-0 bg-linear-to-r from-black/80 via-black/60 to-transparent z-10"></div>
//           <img 
//             src="/pic1.png" 
//             alt="Business Management" 
//             className="w-full h-full object-cover"
//           />
//         </div>
        
//         {/* Content */}
//         <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
//           <div className="max-w-3xl">
//             <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
//               All-in-One Platform for Better Management
//             </h1>
//             <p className="text-xl md:text-2xl text-gray-200 mb-10 leading-relaxed">
//               Secure, reliable, and built to support your business growth.
//             </p>
            
//           </div>
//         </div>
//       </section>

//       {/* Features Section */}
//       <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
//         <div className="max-w-7xl mx-auto">
//           <h2 className="text-4xl md:text-5xl font-bold text-center text-gray-900 dark:text-white mb-16">
//             Powerful Features for Your Business
//           </h2>
//           <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
//             {/* Feature Card 1 */}
//             <div className="p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
//               <div className="w-14 h-14 bg-linear-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6">
//                 <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
//                 </svg>
//               </div>
//               <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Inventory Management</h3>
//               <p className="text-gray-600 dark:text-gray-300">
//                 Track stock levels, manage products with variations, and get real-time inventory updates
//               </p>
//             </div>

//             {/* Feature Card 2 */}
//             <div className="p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
//               <div className="w-14 h-14 bg-linear-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6">
//                 <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
//                 </svg>
//               </div>
//               <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Order Processing</h3>
//               <p className="text-gray-600 dark:text-gray-300">
//                 Streamline order management from creation to fulfillment with automated workflows
//               </p>
//             </div>

//             {/* Feature Card 3 */}
//             <div className="p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
//               <div className="w-14 h-14 bg-linear-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-6">
//                 <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
//                 </svg>
//               </div>
//               <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Customer Management</h3>
//               <p className="text-gray-600 dark:text-gray-300">
//                 Maintain detailed customer profiles and track purchase history for better relationships
//               </p>
//             </div>

//             {/* Feature Card 4 */}
//             <div className="p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
//               <div className="w-14 h-14 bg-linear-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center mb-6">
//                 <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
//                 </svg>
//               </div>
//               <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Analytics & Reports</h3>
//               <p className="text-gray-600 dark:text-gray-300">
//                 Gain insights with comprehensive dashboards and detailed business analytics
//               </p>
//             </div>

//             {/* Feature Card 5 */}
//             <div className="p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
//               <div className="w-14 h-14 bg-linear-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mb-6">
//                 <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
//                 </svg>
//               </div>
//               <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Attendance Tracking</h3>
//               <p className="text-gray-600 dark:text-gray-300">
//                 Monitor employee attendance and work hours with easy check-in/check-out system
//               </p>
//             </div>

//             {/* Feature Card 6 */}
//             <div className="p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
//               <div className="w-14 h-14 bg-linear-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mb-6">
//                 <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
//                 </svg>
//               </div>
//               <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">User Management</h3>
//               <p className="text-gray-600 dark:text-gray-300">
//                 Role-based access control with secure authentication and authorization
//               </p>
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* Why Choose Section */}
//       <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800">
//         <div className="max-w-7xl mx-auto">
//           <div className="grid md:grid-cols-2 gap-12 items-center">
//             <div>
//               <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
//                 Why Choose MiniERP?
//               </h2>
//               <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
//                 MiniERP is designed to simplify business operations for small to medium-sized enterprises. Our intuitive platform brings together all essential business functions in one place.
//               </p>
//               <ul className="space-y-4">
//                 <li className="flex items-start">
//                   <svg className="w-6 h-6 text-green-500 mr-3 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
//                   </svg>
//                   <span className="text-gray-700 dark:text-gray-300">Easy to use interface with minimal learning curve</span>
//                 </li>
//                 <li className="flex items-start">
//                   <svg className="w-6 h-6 text-green-500 mr-3 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
//                   </svg>
//                   <span className="text-gray-700 dark:text-gray-300">Real-time updates and notifications</span>
//                 </li>
//                 <li className="flex items-start">
//                   <svg className="w-6 h-6 text-green-500 mr-3 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
//                   </svg>
//                   <span className="text-gray-700 dark:text-gray-300">Secure and reliable cloud-based solution</span>
//                 </li>
//                 <li className="flex items-start">
//                   <svg className="w-6 h-6 text-green-500 mr-3 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
//                   </svg>
//                   <span className="text-gray-700 dark:text-gray-300">Scalable architecture that grows with your business</span>
//                 </li>
//               </ul>
//             </div>
//             <div className="relative">
//               <div className="aspect-square bg-linear-to-br from-blue-500 to-purple-600 rounded-3xl opacity-20 absolute inset-0 blur-3xl"></div>
//               <div className="relative bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl">
//                 <div className="space-y-4">
//                   <div className="h-4 bg-linear-to-r from-blue-500 to-purple-600 rounded w-3/4"></div>
//                   <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
//                   <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
//                   <div className="grid grid-cols-2 gap-4 pt-6">
//                     <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
//                       <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">500+</div>
//                       <div className="text-sm text-gray-600 dark:text-gray-400">Active Users</div>
//                     </div>
//                     <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
//                       <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">99.9%</div>
//                       <div className="text-sm text-gray-600 dark:text-gray-400">Uptime</div>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* CTA Section */}
//       <section className="py-20 px-4 sm:px-6 lg:px-8 bg-linear-to-r from-blue-600 to-purple-600">
//         <div className="max-w-4xl mx-auto text-center">
//           <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
//             Ready to Transform Your Business?
//           </h2>
//           <p className="text-xl text-blue-100 mb-12">
//             Join hundreds of businesses already using MiniERP to streamline their operations
//           </p>
//           <Link
//             href="/login"
//             className="inline-block px-8 py-4 bg-white text-blue-600 text-lg font-semibold rounded-full hover:shadow-2xl hover:scale-105 transition-all duration-300"
//           >
//             Get Started Today
//           </Link>
//         </div>
//       </section>

//       {/* Footer */}
//       <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
//         <div className="max-w-7xl mx-auto">
//           <div className="grid md:grid-cols-4 gap-8">
//             <div>
//               <span className="text-2xl font-bold bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
//                 MiniERP
//               </span>
//               <p className="mt-4 text-gray-400">
//                 Complete business management solution for modern enterprises
//               </p>
//             </div>
//             <div>
//               <h3 className="font-semibold mb-4">Product</h3>
//               <ul className="space-y-2 text-gray-400">
//                 <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
//                 <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
//               </ul>
//             </div>
//             <div>
//               <h3 className="font-semibold mb-4">Company</h3>
//               <ul className="space-y-2 text-gray-400">
//                 <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
//                 <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
//                 <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
//               </ul>
//             </div>
//             <div>
//               <h3 className="font-semibold mb-4">Legal</h3>
//               <ul className="space-y-2 text-gray-400">
//                 <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
//                 <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
//                 <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
//               </ul>
//             </div>
//           </div>
//           <div className="mt-12 pt-8 border-t border-gray-800 text-center text-gray-400">
//             <p>&copy; 2026 MiniERP. All rights reserved.</p>
//           </div>
//         </div>
//       </footer>
//     </div>
//   );
// }
