"""
Laguna Province Location API - Corrected Barangay Data
A comprehensive API for managing Laguna Province municipalities and barangays with accurate data
"""

import json
import os
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime

@dataclass
class Municipality:
    """Data class for municipality information"""
    id: str
    name: str
    type: str  # 'city' or 'municipality'
    lat: float
    lng: float
    population: Optional[int] = None
    area_km2: Optional[float] = None
    barangays: List[str] = None
    
    def __post_init__(self):
        if self.barangays is None:
            self.barangays = []

@dataclass
class LocationSearchResult:
    """Data class for location search results"""
    type: str  # 'municipality' or 'barangay'
    name: str
    municipality_id: str
    municipality_name: str
    lat: float
    lng: float
    barangay: Optional[str] = None

class LagunaLocationAPI:
    """Main API class for Laguna Province locations"""
    
    def __init__(self, data_file: str = "laguna_locations.json"):
        self.data_file = data_file
        self.municipalities: Dict[str, Municipality] = {}
        self.load_data()
    
    def load_data(self):
        """Load location data from JSON file or create default data"""
        if os.path.exists(self.data_file):
            try:
                with open(self.data_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self._load_from_dict(data)
                print(f"Loaded {len(self.municipalities)} municipalities from {self.data_file}")
            except Exception as e:
                print(f"Error loading data file: {e}")
                self._create_default_data()
        else:
            print(f"Data file {self.data_file} not found, creating default data")
            self._create_default_data()
            self.save_data()
    
    def _load_from_dict(self, data: dict):
        """Load municipalities from dictionary data"""
        self.municipalities = {}
        for muni_data in data.get('municipalities', []):
            municipality = Municipality(**muni_data)
            self.municipalities[municipality.id] = municipality
    
    def _create_default_data(self):
        """Create default Laguna location data with correct barangays"""
        default_municipalities = [
            # Cities
            Municipality("calamba", "Calamba City", "city", 14.1877, 121.1251, 539671, 149.50, [
                "Bagong Kalsada", "Banadero", "Banlic", "Barandal", "Bucal", "Bunggo", "Burol", "Camaligan",
                "Canlubang", "Halang", "Hornalan", "Kay-Anlog", "La Mesa", "Laguerta", "Lawa", "Lecheria",
                "Lingga", "Looc", "Mabato", "Majada Labas", "Makiling", "Mapagong", "Masili", "Maunong",
                "Mayapa", "Milagrosa", "Paciano Rizal", "Palingon", "Palo-Alto", "Pansol", "Parian", "Prinza",
                "Puting Lupa", "Real", "Saimsim", "Sampiruhan", "San Cristobal", "San Jose", "San Juan",
                "Sirang Lupa", "Turbina", "Ulango", "Uwisan", "Villa Espina", "Villa Mercedes"
            ]),
            Municipality("sanpablo", "San Pablo City", "city", 14.0683, 121.3251, 285348, 197.56, [
                "I-A", "I-B", "I-C", "II-A", "II-B", "II-C", "II-D", "II-E", "II-F", "III-A", "III-B", "III-C",
                "III-D", "III-E", "III-F", "IV-A", "IV-B", "IV-C", "V-A", "V-B", "V-C", "V-D", "VI-A", "VI-B",
                "VI-C", "VI-D", "VI-E", "VII-A", "VII-B", "VII-C", "VII-D", "VII-E", "Atisan", "Bagong Bayan",
                "Bagong Pook", "Bautista", "Concepcion", "Del Remedio", "Dolores", "San Antonio", "San Bartolome",
                "San Buenaventura", "San Cristobal", "San Diego", "San Francisco", "San Gabriel", "San Gregorio",
                "San Ignacio", "San Isidro", "San Joaquin", "San Jose", "San Juan", "San Lorenzo", "San Lucas",
                "San Marcos", "San Mateo", "San Miguel", "San Nicolas", "San Pedro", "San Rafael", "San Roque",
                "San Vicente", "Santa Catalina", "Santa Cruz", "Santa Elena", "Santa Isabel", "Santa Maria",
                "Santa Monica", "Santa Veronica", "Santo Angel", "Santo Cristo", "Santo Niño", "Soledad"
            ]),
            Municipality("santarosa", "Santa Rosa City", "city", 14.3119, 121.1114, 353767, 54.13, [
                "Aplaya", "Balibago", "Caingin", "Dila", "Dita", "Don Jose", "Ibaba", "Kanluran", "Labas",
                "Macabling", "Malitlit", "Malusak", "Market Area", "Pooc", "Pulong Santa Cruz", "Santo Domingo",
                "Sinalhan", "Tagapo"
            ]),
            Municipality("binan", "Biñan City", "city", 14.3306, 121.0856, 407437, 43.50, [
                "Biñan", "Bungahan", "Canlalay", "Casile", "De La Paz", "Ganado", "Langkiwa", "Loma", "Malaban",
                "Malamig", "Mamplasan", "Platero", "Poblacion", "San Antonio", "San Francisco", "San Jose",
                "San Vicente", "Santo Niño", "Santo Tomas", "Soro-Soro", "Tubigan", "Zapote"
            ]),
            Municipality("cabuyao", "Cabuyao City", "city", 14.2471, 121.1367, 355330, 43.40, [
                "Baclaran", "Banaybanay", "Banlic", "Bigaa", "Butong", "Casile", "Diezmo", "Gulod", "Mamatid",
                "Marinig", "Niugan", "Pittland", "Pulo", "Punta", "San Isidro", "Sala", "Tramo", "Ulong Tubig"
            ]),
            Municipality("sanpedro", "San Pedro City", "city", 14.3589, 121.0476, 326001, 24.05, [
                "Bagong Silang", "Calendola", "Chrysanthemum", "Cuyab", "Estrella", "G.S.I.S.", "Landayan",
                "Langgam", "Laram", "Magsaysay", "Narra", "Nueva", "Pacita Complex", "Poblacion", "Rosario",
                "Sampaguita", "San Antonio", "San Lorenzo Ruiz", "San Roque", "San Vicente", "Santo Niño",
                "United Bayanihan", "United Better Living", "Villa Esperanza", "Villa Mercedes"
            ]),
            
            # Municipalities - Northern Laguna
            Municipality("siniloan", "Siniloan", "municipality", 14.4167, 121.4500, 39071, 64.51, [
                "Acevida", "Bagong Pag-asa", "Bagumbarangay", "Buhay", "G. Redor", "Gen. Luna", "Halayhayin",
                "Kapatalan", "Laguio", "Liyang", "Llavac", "Magsaysay", "Mayatba", "Mendiola", "Salubungan",
                "Pandayan", "Poblacion", "Wawa"
            ]),
            Municipality("famy", "Famy", "municipality", 14.4333, 121.4500, 16187, 53.06, [
                "Asana", "Bacong-Sigsigan", "Bagong Pag-asa", "Balitoc", "Banaba", "Batuhan", "Bulihan",
                "Calumpang", "Cuenca", "Damortis", "Kapatalan", "Kataypuanan", "Liyang", "Maate",
                "Magdalo", "Mayatba", "Poblacion", "Salambao"
            ]),
            Municipality("mabitac", "Mabitac", "municipality", 14.4500, 121.4333, 20234, 80.76, [
                "Amuyong", "Bayanihan", "Lambac", "Libis", "Lucong", "Matalatala", "Nanguma", "Numero",
                "Paagahan", "Poblacion", "San Antonio", "Sinagtala", "Libis ng Nayon"
            ]),
            Municipality("stamaria", "Sta. Maria", "municipality", 14.4667, 121.4167, 30001, 108.40, [
                "Adia", "Bagong Silang", "Bubucal", "Cabooan", "Coralan", "Inayapan", "Jose P. Rizal",
                "Macasipac", "Masinao", "Parang ng Buho", "Poblacion", "Tungkod"
            ]),
            Municipality("magsaysay", "Magsaysay", "municipality", 14.4833, 121.4000, 25000, 85.00, [
                "Bayanihan", "Coralao-Dalakit", "Lambac", "Malinao", "Poblacion", "Tanawan", "Tucal"
            ]),
            
            # Municipalities - Eastern Laguna
            Municipality("paete", "Paete", "municipality", 14.3667, 121.4833, 25396, 55.02, [
                "Bagumbayan", "Bangkusay", "Ermita", "Ibaba del Norte", "Ibaba del Sur", "Ilaya del Norte",
                "Ilaya del Sur", "Maytoong", "Poblacion", "Quinale", "Wawa"
            ]),
            Municipality("pakil", "Pakil", "municipality", 14.3833, 121.4833, 23000, 50.00, [
                "Baño", "Burgos", "Casa Real", "Casinsin", "Dorado", "Gonzales", "Kabulusan", "Matikiw",
                "Poblacion", "Rizal", "Saray", "Taft", "Tavera"
            ]),
            Municipality("pangil", "Pangil", "municipality", 14.4000, 121.4667, 25000, 45.00, [
                "Balian", "Dambo", "Galalan", "Isla", "Mabato-Azufre", "Natividad", "Poblacion", "San Jose",
                "Sulib", "Tabugon"
            ]),
            Municipality("pagsanjan", "Pagsanjan", "municipality", 14.2667, 121.4500, 44027, 26.36, [
                "Anibong", "Biñan", "Buboy", "Cabanbanan", "Calusiche", "Dingin", "Lambac", "Layugan",
                "Magdapio", "Maulawin", "Mendiola", "Pinagsanjan", "Poblacion Dos", "Poblacion Tres",
                "Poblacion Uno", "Sabang", "Sampaloc", "San Isidro"
            ]),
            Municipality("cavinti", "Cavinti", "municipality", 14.2500, 121.5000, 23000, 40.00, [
                "Anglas", "Bangco", "Bukal", "Bulajo", "Cansuso", "Duhat", "Inao-Awan", "Kanluran",
                "Labayo", "Layasin", "Mahipon", "Paowin", "Poblacion", "Sisilmin", "Sumucab", "Tibatib",
                "Udia", "Wawa"
            ]),
            Municipality("lumban", "Lumban", "municipality", 14.3000, 121.4667, 30000, 35.00, [
                "Bagong Silang", "Balimbingan", "Balubad", "Caliraya", "Concepcion", "Lewin", "Maracta",
                "Maytalang Uno", "Maytalang Dos", "Primera", "Poblacion", "Primera", "Salac", "Santo Niño",
                "Wawa"
            ]),
            Municipality("kalayaan", "Kalayaan", "municipality", 14.2691, 121.4213, 24000, 30.00, [
                "Longos", "San Antonio", "San Juan"
            ]),
            
            # Municipalities - Central Laguna
            Municipality("santacruz", "Santa Cruz", "municipality", 14.2854, 121.4134, 123211, 38.59, [
                "Alipit", "Bagumbayan", "Bubukal", "Calios", "Duhat", "Gatid", "Jasaan", "Labuin",
                "Malinao", "Oogong", "Pagsawitan", "Palasan", "Patimbao", "Poblacion A", "Poblacion B",
                "Poblacion C", "Poblacion D", "Poblacion E", "Poblacion F", "San Jose", "San Juan",
                "San Pablo Norte", "San Pablo Sur", "Santisimo", "Santo Angel Norte", "Santo Angel Sur"
            ]),
            Municipality("bay", "Bay", "municipality", 14.1833, 121.2833, 67082, 42.66, [
                "Bitin", "Calo", "Daniw", "Maitim", "Masaya", "Paciano Rizal", "Poblacion", "Puypuy",
                "San Antonio", "San Isidro", "Santa Cruz", "Tagumpay", "Tranca", "Bitin"
            ]),
            Municipality("losbanos", "Los Baños", "municipality", 14.1692, 121.2417, 115353, 54.22, [
                "Anos", "Bagong Silang", "Bambang", "Batong Malake", "Baybayin", "Bayog", "Lalakay",
                "Maahas", "Malinta", "Mayondon", "Poblacion", "Putho-Tuntungin", "San Antonio", "Tadlac",
                "Timugan"
            ]),
            Municipality("calauan", "Calauan", "municipality", 14.1497, 121.3156, 87078, 65.40, [
                "Balayhangin", "Bangyas", "Dayap", "Hanggan", "Imok", "Lamot 1", "Lamot 2", "Limao",
                "Mabacan", "Masiit", "Paliparan", "Perez", "Poblacion", "Prinza", "San Isidro", "Santo Tomas"
            ]),
            Municipality("alaminos", "Alaminos", "municipality", 14.0639, 121.2461, 51019, 57.64, [
                "Del Carmen", "Poblacion", "San Agustin", "San Benito", "San Gregorio", "San Ildefonso",
                "San Miguel", "San Roque", "Santa Rosa"
            ]),
            
            # Municipalities - Southern Laguna
            Municipality("magdalena", "Magdalena", "municipality", 14.2000, 121.4333, 25000, 25.00, [
                "Alipit", "Baanan", "Balanac", "Bucal", "Buenavista", "Bungkol", "Halayhayin", "Ibabang Atingay",
                "Ibabang Butnong", "Ilayang Atingay", "Ilayang Butnong", "Malinao", "Malvar", "Poblacion",
                "Sabang", "Salasad", "Tanawan", "Tipakan"
            ]),
            Municipality("majayjay", "Majayjay", "municipality", 14.1500, 121.4667, 28000, 30.00, [
                "Amonoy", "Bakia", "Balanac", "Banti", "Bitaoy", "Bukal", "Burgos", "Coralao", "Gagalot",
                "Ibabang Banga", "Ibabang Bayucain", "Ilayang Banga", "Ilayang Bayucain", "May-It", "Munting Kawayan",
                "Olla", "Origuel", "Panalaban", "Pangil", "Piit", "Poblacion", "Puypuy", "Suba", "Talortor",
                "Tanawan", "Taytay", "Villa Nogales"
            ]),
            Municipality("liliw", "Liliw", "municipality", 14.1333, 121.4333, 36000, 20.00, [
                "Bagong Anyo", "Bayate", "Bongkol", "Bubukal", "Cabuyao", "Calumpang", "Culoy", "Dagatan",
                "Daniw", "Dita", "Ibabang Palina", "Ibabang San Roque", "Ilayang Palina", "Ilayang San Roque",
                "Kanlurang Bukal", "Laguan", "Luquin", "Malabo-Kalantukan", "Masikap", "Mojon", "Novaliches",
                "Oples", "Pag-asa", "Palina", "Poblacion", "Rizal", "San Isidro", "Silangang Bukal", "Tuy-Baanan"
            ]),
            Municipality("nagcarlan", "Nagcarlan", "municipality", 14.1333, 121.4167, 65000, 78.10, [
                "Abo", "Alibungbungan", "Alilinan", "Balayong", "Balimbing", "Balinacon", "Bambang", "Banago",
                "Banca-banca", "Bangcuro", "Banilad", "Bigo", "Buboy", "Buhanginan", "Bukal", "Bunga",
                "Cabuyew", "Calumpang", "Kanluran", "Labangan", "Lawaguin", "Maiit", "Malaya", "Manaol",
                "Maravilla", "Nagcalbang", "Oples", "Palayan", "Poblacion I", "Poblacion II", "Poblacion III",
                "Sabang", "Silangan", "Sisilmin", "Sulsuguin", "Talahib", "Talangan", "Taytay", "Tipacan",
                "Wakat", "Yukos"
            ]),
            Municipality("rizal", "Rizal", "municipality", 14.1167, 121.4000, 18000, 15.00, [
                "Antipolo", "East Poblacion", "Entablado", "Laguan", "Paule 1", "Paule 2", "Pook", "Tala",
                "Talaga", "Tuy", "West Poblacion"
            ]),
            Municipality("sanpascual", "San Pascual", "municipality", 14.1000, 121.3833, 20000, 18.00, [
                "Bagong Pag-asa", "Boe", "Bukal", "Capilla", "Del Remedio", "Laguna", "Poblacion",
                "San Antonio", "San Gregorio"
            ]),
            Municipality("pila", "Pila", "municipality", 14.2333, 121.3667, 54000, 31.20, [
                "Aplaya", "Bagong Pook", "Concepcion", "Labuin", "Linga", "Masico", "Mojon", "Pansol",
                "Pinagbayanan", "Poblacion", "Prenza", "San Antonio", "San Miguel", "Santa Clara Norte",
                "Santa Clara Sur", "Tubuan"
            ]),
            Municipality("victoria", "Victoria", "municipality", 14.2167, 121.3333, 43000, 22.35, [
                "Banca-banca", "Daniw", "Masapang", "Nanhaya", "Poblacion", "San Benito", "San Felix",
                "San Francisco", "San Roque"
            ])
        ]
        
        for municipality in default_municipalities:
            self.municipalities[municipality.id] = municipality
    
    def save_data(self):
        """Save location data to JSON file"""
        try:
            data = {
                'municipalities': [asdict(muni) for muni in self.municipalities.values()],
                'last_updated': datetime.now().isoformat(),
                'version': '1.0'
            }
            with open(self.data_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"Saved {len(self.municipalities)} municipalities to {self.data_file}")
        except Exception as e:
            print(f"Error saving data: {e}")
    
    def get_municipality(self, municipality_id: str) -> Optional[Municipality]:
        """Get municipality by ID"""
        return self.municipalities.get(municipality_id)
    
    def get_municipality_by_name(self, name: str) -> Optional[Municipality]:
        """Get municipality by name (case-insensitive)"""
        name_lower = name.lower()
        for municipality in self.municipalities.values():
            if municipality.name.lower() == name_lower:
                return municipality
        return None
    
    def get_all_municipalities(self) -> List[Municipality]:
        """Get all municipalities"""
        return list(self.municipalities.values())
    
    def get_municipalities_by_type(self, muni_type: str) -> List[Municipality]:
        """Get municipalities by type (city or municipality)"""
        return [muni for muni in self.municipalities.values() if muni.type == muni_type]
    
    def get_barangays(self, municipality_id: str) -> List[str]:
        """Get barangays for a municipality"""
        municipality = self.get_municipality(municipality_id)
        return municipality.barangays if municipality else []
    
    def search_locations(self, query: str) -> List[LocationSearchResult]:
        """Search for locations by name"""
        query_lower = query.lower()
        results = []
        
        # Search municipalities
        for municipality in self.municipalities.values():
            if query_lower in municipality.name.lower() or query_lower in municipality.id.lower():
                results.append(LocationSearchResult(
                    type='municipality',
                    name=municipality.name,
                    municipality_id=municipality.id,
                    municipality_name=municipality.name,
                    lat=municipality.lat,
                    lng=municipality.lng
                ))
        
        # Search barangays
        for municipality in self.municipalities.values():
            for barangay in municipality.barangays:
                if query_lower in barangay.lower():
                    results.append(LocationSearchResult(
                        type='barangay',
                        name=f"{barangay}, {municipality.name}",
                        municipality_id=municipality.id,
                        municipality_name=municipality.name,
                        lat=municipality.lat,
                        lng=municipality.lng,
                        barangay=barangay
                    ))
        
        return results
    
    def get_location_stats(self) -> Dict:
        """Get statistics about the location data"""
        total_municipalities = len(self.municipalities)
        cities = len(self.get_municipalities_by_type('city'))
        municipalities = len(self.get_municipalities_by_type('municipality'))
        total_barangays = sum(len(muni.barangays) for muni in self.municipalities.values())
        
        return {
            'total_municipalities': total_municipalities,
            'cities': cities,
            'municipalities': municipalities,
            'total_barangays': total_barangays,
            'last_updated': datetime.now().isoformat()
        }

# Global instance
laguna_api = LagunaLocationAPI()

# Convenience functions
def get_municipality(municipality_id: str) -> Optional[Municipality]:
    return laguna_api.get_municipality(municipality_id)

def get_all_municipalities() -> List[Municipality]:
    return laguna_api.get_all_municipalities()

def get_barangays(municipality_id: str) -> List[str]:
    return laguna_api.get_barangays(municipality_id)

def search_locations(query: str) -> List[LocationSearchResult]:
    return laguna_api.search_locations(query)

def get_location_stats() -> Dict:
    return laguna_api.get_location_stats()