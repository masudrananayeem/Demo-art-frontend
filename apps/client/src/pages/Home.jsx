import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from "framer-motion";
import { ArrowUpRight, ArrowRight, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import PageTransition from "../components/PageTransition";
import Reveal, { Stagger, StaggerItem } from "../components/Reveal";
import { SUBCATEGORIES, img } from "../data/products";
import { useStore } from "../context/StoreContext";
import { formatBDT, getOriginalPrice, hasActiveOffer } from "../lib/money";

const PEOPLE = [
  { id: "women", name: "Women", index: "01", line: "Soft structure / sharp attitude", seed: "ac-women-editorial" },
  { id: "men", name: "Men", index: "02", line: "Quiet tailoring / everyday form", seed: "ac-men-editorial" },
  { id: "kids", name: "Children", index: "03", line: "Playful proportions / easy movement", seed: "ac-kids-editorial" },
];

function SplitLine({ children, delay = 0 }) {
  return (
    <span className="split-line"><motion.span initial={{ y: "105%" }} animate={{ y: 0 }} transition={{ duration: .9, delay, ease: [0.16, 1, 0.3, 1] }}>{children}</motion.span></span>
  );
}

function MagneticLink({ children, className = "", to }) {
  const ref = useRef(null);
  const x = useSpring(0, { stiffness: 280, damping: 18 });
  const y = useSpring(0, { stiffness: 280, damping: 18 });
  return (
    <motion.div ref={ref} style={{ x, y }} onMouseMove={(e) => {
      const r = ref.current?.getBoundingClientRect(); if (!r) return;
      x.set((e.clientX - (r.left + r.width / 2)) * .12); y.set((e.clientY - (r.top + r.height / 2)) * .12);
    }} onMouseLeave={() => { x.set(0); y.set(0); }}>
      <Link to={to} className={className}>{children}</Link>
    </motion.div>
  );
}

function Hero({ siteContent }) {
  const ref = useRef(null);
  const heroImage = siteContent?.heroImage;
  const heroHeadline = siteContent?.heroHeadline;
  const heroTagline = siteContent?.heroTagline;
  const topLeft = siteContent?.heroTopLeft || "ARTCANVAS / NEW SEASON";
  const topRight = siteContent?.heroTopRight || "DROP 04 — 2026";
  const ctaLabel = siteContent?.heroCtaLabel || "Explore the collection";
  const ctaLink = siteContent?.heroCtaLink || "/shop?category=clothing";
  const ctaNote = siteContent?.heroCtaNote || "Designed in small runs.\nMade to be kept.";
  const bottomLeft = siteContent?.heroBottomLeft || "01";
  const bottomRight = siteContent?.heroBottomRight || "EST. 2026";
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imageY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const titleY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const opacity = useTransform(scrollYProgress, [0, .7], [1, 0]);
  return (
    <section ref={ref} className="hero-editorial">
      <motion.img style={{ y: imageY, scale: 1.08 }} src={heroImage || img("ac-hero-new", 1800, 1200)} alt="ArtCanvas latest collection" className="hero-editorial__image" />
      <div className="hero-editorial__shade" />
      <div className="hero-editorial__grid" />
      <motion.div style={{ opacity }} className="hero-editorial__top"><p>{topLeft}</p><p>{topRight}</p></motion.div>
      <motion.div style={{ opacity }} className="hero-editorial__side"><span>SCROLL</span><i /><span>01 — 04</span></motion.div>
      <motion.div style={{ y: titleY }} className="hero-editorial__content">
        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .15 }} className="eyebrow-light">{heroTagline || "A STUDY IN EVERYDAY FORM"}</motion.p>
        {heroHeadline ? (
          <h1><SplitLine delay={.22}>{heroHeadline}</SplitLine></h1>
        ) : (
          <h1><SplitLine delay={.22}>Wear the</SplitLine><SplitLine delay={.34}><em>unfamiliar.</em></SplitLine></h1>
        )}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .5 }} className="hero-editorial__actions">
          <MagneticLink to={ctaLink} className="hero-cta">{ctaLabel} <ArrowUpRight size={15} /></MagneticLink>
          <span>{ctaNote.split("\n").map((line, i) => <React.Fragment key={i}>{i > 0 && <br />}{line}</React.Fragment>)}</span>
        </motion.div>
      </motion.div>
      <div className="hero-editorial__bottom"><span>{bottomLeft}</span><div className="hero-categories"><Link to="/shop?category=clothing">Clothing</Link><Link to="/gallery">Art</Link><Link to="/shop?category=objects">Objects</Link><Link to="/shop?category=accessories">Accessories</Link></div><span>{bottomRight}</span></div>
      <motion.div className="hero-scroll-pulse" animate={{ y: [0, 9, 0], opacity: [.35, 1, .35] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }} />
    </section>
  );
}

function People({ products, siteContent }) {
  const newest = products.slice(0, 10);
  const [active, setActive] = React.useState(0);
  const maxIndex = Math.max(0, newest.length - 4);
  const move = (direction) => setActive((v) => Math.max(0, Math.min(maxIndex, v + direction)));
  return (
    <section className="whats-new section-shell">
      <Reveal className="section-heading-line whats-new__heading"><div><p className="section-kicker">03 — WHAT'S NEW / THE EDIT</p><h2>{(siteContent?.whatsNewTitle || "What’s new.").split(" ")[0]}<br /><em>{(siteContent?.whatsNewTitle || "What’s new.").split(" ").slice(1).join(" ")}</em></h2></div><div className="whats-new__intro"><p className="section-note">{siteContent?.whatsNewDescription || "Fresh pieces, new proportions and objects worth noticing."}</p><Link to="/shop" className="text-link">See everything <ArrowRight size={15} /></Link></div></Reveal>
      <div className="whats-new__carousel">
        <button className="whats-new__arrow" type="button" onClick={() => move(-1)} disabled={!active} aria-label="Previous pieces"><ChevronLeft size={22}/><span>PREV</span></button>
        <div className="whats-new__viewport"><motion.div className="whats-new__track" animate={{ x: `calc(-${active} * (var(--new-card-width) + var(--new-gap)))` }} transition={{type:'spring',stiffness:260,damping:30}}>
          {newest.map((product,index)=><article key={product.id} className={`new-piece new-piece--${index%4}`}><Link to={`/product/${product.id}`} className="new-piece__link"><div className="new-piece__image"><img src={product.image || img(product.seed,760,900)} alt={product.name}/><span className="new-piece__index">{String(index+1).padStart(2,'0')}</span><span className="new-piece__tag">NEW</span><span className="new-piece__view">View piece <ArrowUpRight size={13}/></span></div><div className="new-piece__meta"><span>{product.subcategory||product.category}</span><span>{hasActiveOffer(product) ? <><span className="line-through opacity-40 mr-1">{formatBDT(getOriginalPrice(product))}</span><span className="text-[#A8431E]">{formatBDT(product.price)}</span></> : formatBDT(product.price)}</span></div><h3>{product.name}</h3></Link></article>)}
        </motion.div></div>
        <button className="whats-new__arrow" type="button" onClick={() => move(1)} disabled={active===maxIndex} aria-label="Next pieces"><span>NEXT</span><ChevronRight size={22}/></button>
      </div>
      <div className="whats-new__pager"><span>{String(active+1).padStart(2,'0')}</span><div><i style={{width:`${((active+1)/(maxIndex+1))*100}%`}}/></div><span>{String(maxIndex+1).padStart(2,'0')}</span></div>
    </section>
  );
}

function FashionFilm({ siteContent }) {
  return (
    <section className="fashion-film section-shell">
      <div className="fashion-film__head">
        <div>
          <p className="section-kicker">FILM / 2026</p>
          <h2>{(siteContent?.filmTitle || "Clothing in motion.").split(" ")[0]}<br /><em>{(siteContent?.filmTitle || "Clothing in motion.").split(" ").slice(1).join(" ")}</em></h2>
        </div>
        <p className="section-note">{siteContent?.filmDescription || "A moving study of fabric, proportion and everyday gesture."}</p>
      </div>
      <div className="fashion-film__frame">
        <video className="fashion-film__video" autoPlay muted loop playsInline preload="metadata" poster="/brand/artcanvas-logo.png" aria-label="ArtCanvas clothing editorial film">
          <source src={siteContent?.filmVideoUrl || "/clothing-editorial.mp4"} type="video/mp4" />
        </video>
        <div className="fashion-film__overlay"><span>ARTCANVAS / CLOTHING</span><span>00:10 — EDITORIAL STUDY</span></div>
        <div className="fashion-film__center"><span>PLAYING</span><i /></div>
      </div>
    </section>
  );
}

// What shows in the "Currently interesting" rail, in priority order:
// 1) pieces the admin has hand-picked as featured,
// 2) then the best sellers (most units actually bought), to fill any
//    remaining slots,
// 3) and only if neither exists yet, a handful of clothing as a fallback.
function pickCurrentlyInteresting(products, count = 6) {
  const featured = products.filter((p) => p.isFeatured);
  const picked = [...featured];
  const pickedIds = new Set(picked.map((p) => p.id));

  if (picked.length < count) {
    const bestSellers = [...products]
      .filter((p) => !pickedIds.has(p.id) && (p.sold || 0) > 0)
      .sort((a, b) => (b.sold || 0) - (a.sold || 0));
    for (const p of bestSellers) {
      if (picked.length >= count) break;
      picked.push(p);
      pickedIds.add(p.id);
    }
  }

  if (picked.length < count) {
    const fallback = products.filter((p) => !pickedIds.has(p.id) && p.category === "clothing");
    for (const p of fallback) {
      if (picked.length >= count) break;
      picked.push(p);
      pickedIds.add(p.id);
    }
  }

  return picked.slice(0, count);
}

function ProductRail({ products, siteContent }) {
  const EDIT = pickCurrentlyInteresting(products, 6);
  const { addToBag } = useStore();
  return (
    <section className="edit-editorial section-shell">
      <Reveal className="section-heading-line">
        <div>
          <p className="section-kicker">04 — THE EDIT</p>
          <h2>{(siteContent?.featuredTitle || "Currently interesting.").split(" ")[0]}<br /><em>{(siteContent?.featuredTitle || "Currently interesting.").split(" ").slice(1).join(" ")}</em></h2>
        </div>
        <div className="text-right"><p className="section-note mb-2">{siteContent?.featuredDescription || ""}</p><MagneticLink to="/shop" className="text-link">View all pieces <ArrowRight size={15} /></MagneticLink></div>
      </Reveal>
      <div className="product-rail">
        {EDIT.map((product, i) => (
          <motion.div
            key={product.id}
            className={`rail-product rail-product--${i % 3}`}
            initial={{ opacity: 0, y: 55 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: .15 }}
            transition={{ duration: .7, delay: (i % 3) * .08, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link to={`/product/${product.id}`}>
              <div className="rail-product__image">
                <motion.img
                  whileHover={{ scale: 1.06 }}
                  transition={{ duration: .7, ease: [0.22, 1, 0.36, 1] }}
                  src={product.image || img(product.seed, 650, 820)}
                  alt={product.name}
                />
                <span>{String(i + 1).padStart(2, "0")}</span>
                {product.isFeatured ? (
                  <span className="micro-tag !absolute !top-3 !right-3">Featured</span>
                ) : product.sold > 0 ? (
                  <span className="micro-tag !absolute !top-3 !right-3">Best seller</span>
                ) : null}
                <button
                  type="button"
                  aria-label={`Add ${product.name} to cart`}
                  disabled={product.inStock === false}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (product.inStock !== false) addToBag(product); }}
                  className="disabled:opacity-40"
                >
                  <Plus size={16} />
                </button>
                <div className="rail-product__reveal">View piece <ArrowUpRight size={13} /></div>
              </div>
              <div className="rail-product__meta">
                <span>{product.subcategory || "Object"}</span>
                <span>{hasActiveOffer(product) ? <><span className="line-through opacity-40 mr-1">{formatBDT(getOriginalPrice(product))}</span><span className="text-[#A8431E]">{formatBDT(product.price)}</span></> : formatBDT(product.price)}</span>
              </div>
              <h3>{product.name}</h3>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function WearingStory() {
  const sectionRef = useRef(null);
  const [active, setActive] = React.useState(0);
  const story = [
    { id: 'women', number: '01', title: 'Women', serif: 'The art of wearing.', line: 'Fluid lines / considered layers', seed: 'ac-wearing-women', sub: 'Dresses · Outerwear · Tops', link: '/shop?category=clothing&gender=women' },
    { id: 'men', number: '02', title: 'Men', serif: 'The art of wearing.', line: 'Quiet tailoring / everyday form', seed: 'ac-wearing-men', sub: 'Shirts · Outerwear · Trousers', link: '/shop?category=clothing&gender=men' },
    { id: 'kids', number: '03', title: 'Children', serif: 'The art of wearing.', line: 'Playful proportions / easy movement', seed: 'ac-wearing-kids', sub: 'Tees · Outerwear · Sets', link: '/shop?category=clothing&gender=kids' },
  ];

  React.useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let raf = 0;
    const update = () => {
      const rect = section.getBoundingClientRect();
      const travel = Math.max(section.offsetHeight - window.innerHeight, 1);
      const progress = Math.max(0, Math.min(1, -rect.top / travel));
      const next = Math.min(story.length - 1, Math.floor(progress * story.length));
      setActive((value) => value === next ? value : next);
      raf = 0;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', update);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const current = story[active];
  return (
    <section ref={sectionRef} className="wearing-editorial section-shell">
      <div className="wearing-editorial__sticky">
        <div className="wearing-editorial__intro">
          <span className="intro-editorial__number">02</span>
          <div>
            <p className="section-kicker">THE ART OF WEARING</p>
            <h2>Not a trend.<br /><em>A point of view.</em></h2>
            <p className="wearing-editorial__body">ArtCanvas brings clothing, objects and visual culture into one considered space — less catalogue, more curation.</p>
            <Link className="wearing-editorial__intro-link" to="/shop?category=clothing">Enter the collection <ArrowUpRight size={14} /></Link>
          </div>
        </div>

        <div className="wearing-editorial__visual" aria-live="polite">
          {story.map((item, index) => (
            <motion.div key={item.id} className="wearing-frame" initial={false} animate={{ opacity: active === index ? 1 : 0, scale: active === index ? 1 : 1.035, x: active === index ? 0 : index < active ? -20 : 20 }} transition={{ duration: .8, ease: [0.16, 1, 0.3, 1] }}>
              <img src={img(item.seed, 1100, 1320)} alt={`${item.title} clothing editorial`} />
              <div className="wearing-frame__veil" />
              <div className="wearing-frame__top"><span>{item.number} / 03</span><span>ARTCANVAS / CLOTHING</span></div>
              <div className="wearing-frame__caption"><span>{item.line}</span><strong>{item.title}</strong></div>
            </motion.div>
          ))}
          <div className="wearing-editorial__scanline" />
        </div>

        <div className="wearing-editorial__info">
          <AnimatePresence mode="wait">
            <motion.div key={current.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }} transition={{ duration: .45 }}>
              <p className="section-kicker">{current.number} — {current.title}</p>
              <h3>{current.serif}</h3>
              <p>{current.sub}</p>
              <Link to={current.link}>Explore {current.title} <ArrowUpRight size={14} /></Link>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="wearing-editorial__progress" aria-hidden="true">
          {story.map((item, index) => <span key={item.id} className={active === index ? 'is-active' : ''}><i />{item.number}</span>)}
        </div>
        <div className="wearing-editorial__scroll-label"><span>SCROLL TO MOVE</span><i /></div>
      </div>
      <div className="wearing-editorial__steps" aria-hidden="true">
        {story.map((item, index) => <article key={item.id} className={`wearing-step ${active === index ? 'is-active' : ''}`}><span>{item.number}</span><div><p>{item.title}</p><small>{item.line}</small></div></article>)}
      </div>
    </section>
  );
}
export default function Home() {
  const { products, siteContent } = useStore();
  return <PageTransition><main className="home-page"><>{siteContent?.showAnnouncement && siteContent?.announcementText && <div className="px-6 py-2 text-center text-[10px] uppercase tracking-[.2em] border-b border-current/10">{siteContent.announcementText}</div>}</><Hero siteContent={siteContent} /><WearingStory />{siteContent?.showFilm !== false && <FashionFilm siteContent={siteContent} />}{siteContent?.showWhatsNew !== false && <People products={products} siteContent={siteContent} />}<ProductRail products={products} siteContent={siteContent} /><section className="manifesto-editorial" style={{ display: siteContent?.showManifesto === false ? "none" : undefined }}><motion.img initial={{ scale: 1.08 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ duration: 1.2 }} src={siteContent?.manifestoImage || img("ac-side-studio", 1800, 1050)} alt="ArtCanvas studio" /><div className="manifesto-editorial__shade" /><motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: .3 }} transition={{ duration: .8 }} className="manifesto-editorial__content"><p className="section-kicker light">05 — THE STUDIO</p><h2>Objects with<br /><em>a pulse.</em></h2><p>Small runs. Strong materials. A little friction between the familiar and the new.</p><MagneticLink to="/gallery" className="manifesto-link">Enter the visual archive <ArrowUpRight size={15} /></MagneticLink></motion.div></section></main></PageTransition>;
}
