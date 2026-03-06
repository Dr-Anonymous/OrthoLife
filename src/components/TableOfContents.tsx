import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { TocItem } from '@/utils/toc';
import { useTranslation } from 'react-i18next';
import { List } from 'lucide-react';

interface TableOfContentsProps {
    items: TocItem[];
    className?: string;
}

export function TableOfContents({ items, className }: TableOfContentsProps) {
    const { t } = useTranslation();
    const [activeId, setActiveId] = useState<string>('');

    useEffect(() => {
        if (items.length === 0) return;

        // We observe all the headings the TOC links to
        const headingElements = items.map((item) => document.getElementById(item.id));

        const observer = new IntersectionObserver(
            (entries) => {
                // Go through all entries that changed their intersection status
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.id);
                    }
                });
            },
            {
                // Root margin: trigger slightly before the heading hits the exact top
                // negative top margin means it triggers when the item is further down the page
                // 100px from top, 0px bottom margin
                rootMargin: '-100px 0px 0px 0px',
                // Threshold: trigger as soon as any part of the heading is visible
                threshold: 0,
            }
        );

        headingElements.forEach((element) => {
            if (element) {
                observer.observe(element);
            }
        });

        return () => {
            headingElements.forEach((element) => {
                if (element) {
                    observer.unobserve(element);
                }
            });
            observer.disconnect();
        };
    }, [items]);

    const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        e.preventDefault();
        const element = document.getElementById(id);
        if (element) {
            // Get the height of the fixed header (aprox 80px) plus some padding
            const yOffset = -100;
            const y = element.getBoundingClientRect().top + window.scrollY + yOffset;

            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };

    if (items.length === 0) {
        return null;
    }

    return (
        <nav className={cn('space-y-4', className)}>
            <div className="flex items-center gap-2 font-semibold text-lg border-b pb-2 mb-4">
                <List className="h-5 w-5" />
                <h2>{t('blog.tableOfContents') || 'Table of Contents'}</h2>
            </div>
            <ul className="space-y-2.5 text-sm">
                {items.map((item) => (
                    <li
                        key={item.id}
                        className={cn(
                            'transition-all duration-200',
                            item.level === 3 ? 'ml-4' : '', // Indent H3s
                            activeId === item.id
                                ? 'text-primary font-medium'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <a
                            href={`#${item.id}`}
                            onClick={(e) => scrollToSection(e, item.id)}
                            className="line-clamp-2"
                            title={item.text}
                        >
                            {item.text}
                        </a>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
