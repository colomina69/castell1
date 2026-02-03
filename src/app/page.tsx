import { Shield } from '@/components/Shield';
import { Info, MapPin, Instagram, Facebook } from 'lucide-react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';

export default function Home() {
  return (
    <main className="min-h-screen bg-fila-light selection:bg-fila-gold selection:text-white scroll-smooth">
      <Navbar />

      {/* Hero Section */}
      <section id="inicio" className="pt-32 pb-20 px-6 text-center relative overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-fila-green/5 blur-3xl rounded-full" />
        <div className="absolute top-20 -left-20 w-72 h-72 bg-fila-gold/5 blur-3xl rounded-full" />

        <Shield />

        <h1 className="mt-8 text-5xl md:text-7xl font-extrabold tracking-tighter text-fila-dark">
          FILÀ <br />
          <span className="gradient-gold">MOROS DEL CASTELL</span>
        </h1>

        <p className="mt-6 text-lg text-gray-600 max-w-lg mx-auto leading-relaxed">
          Tradición, historia y germanor en el corazón de Benilloba. Nuestra herencia mora perdura desde 1947.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/historia" className="bg-fila-green text-white px-8 py-4 rounded-full font-bold shadow-lg shadow-fila-green/20 hover:bg-fila-green/90 transition-all transform hover:scale-105 inline-block">
            Conoce nuestra historia
          </Link>
          <button className="border-2 border-fila-gold text-fila-gold px-8 py-4 rounded-full font-bold hover:bg-fila-gold hover:text-white transition-all transform hover:scale-105">
            Contactar
          </button>
        </div>
      </section>

      {/* Features / Info */}
      <section id="historia" className="py-20 bg-fila-dark text-white px-6">
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-12 text-center">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-fila-green/20 rounded-2xl flex items-center justify-center mb-6 text-fila-green">
              <Info size={32} />
            </div>
            <h3 className="text-xl font-bold mb-3">Fundada en 1947</h3>
            <p className="text-gray-400">Décadas de historia y desfiles que marcan nuestra identidad en Benilloba.</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-fila-gold/20 rounded-2xl flex items-center justify-center mb-6 text-fila-gold">
              <MapPin size={32} />
            </div>
            <h3 className="text-xl font-bold mb-3">Sede Social</h3>
            <p className="text-gray-400">Punto de encuentro para festeros y amigos en la calle Major.</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-fila-red/20 rounded-2xl flex items-center justify-center mb-6 text-fila-red">
              <Instagram size={32} />
            </div>
            <h3 className="text-xl font-bold mb-3">Únete a nosotros</h3>
            <p className="text-gray-400">Forma parte de la familia del Castell y vive las fiestas desde dentro.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contacto" className="py-12 border-t border-fila-gold/10 bg-white px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <h2 className="text-2xl font-bold text-fila-dark mb-2">Filà Moros del Castell</h2>
            <p className="text-gray-500">Benilloba © 2026. Tots els drets reservats.</p>
          </div>
          <div className="flex gap-6">
            <Facebook className="text-fila-dark hover:text-fila-gold cursor-pointer transition-colors" />
            <Instagram className="text-fila-dark hover:text-fila-gold cursor-pointer transition-colors" />
            <div className="text-fila-dark hover:text-fila-gold cursor-pointer font-bold">TIC</div>
          </div>
        </div>
      </footer>
    </main>
  );
}
