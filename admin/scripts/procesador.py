import os
from PIL import Image
import argparse
import sys
import time
import shutil

# --- CONFIGURACIÓN ---
try:
    script_dir = os.path.dirname(os.path.abspath(__file__))
except NameError:
    script_dir = os.getcwd()

carpeta_entrada = os.path.join(script_dir, 'entrada')
carpeta_salida = os.path.join(script_dir, 'salida_ia')
tamaño_maximo = (500, 500)
calidad_jpg = 80  # Calidad optimizada para web
extensiones_validas = ('.png', '.jpg', '.jpeg', '.webp')

# --- LÓGICA DE ARGUMENTOS ---
parser = argparse.ArgumentParser(description="Optimiza imágenes a un tamaño máximo de 500x500.")
parser.add_argument('--rotate', type=str, choices=['left', 'right'], help='Rotar la imagen.')
args = parser.parse_args()
rotation = args.rotate

print("--- INICIO DE OPTIMIZACIÓN INTELIGENTE ---")
print(f"Opción de rotación: {rotation or 'Ninguna'}")
print("------------------------------------------")

# --- LÓGICA DEL SCRIPT ---
if not os.path.exists(carpeta_salida):
    os.makedirs(carpeta_salida)

try:
    archivos = os.listdir(carpeta_entrada)
except Exception as e:
    print(f"ERROR al leer la carpeta de entrada: {e}")
    exit()

if not archivos:
    print("AVISO: La carpeta 'entrada' está vacía.")
    exit()

print(f"Iniciando proceso para {len(archivos)} archivos...")
contador = 0

for nombre_archivo in archivos:
    if nombre_archivo.lower().endswith(extensiones_validas):
        try:
            ruta_entrada = os.path.join(carpeta_entrada, nombre_archivo)
            
            # Generación de nombre único
            nombre_base = os.path.splitext(nombre_archivo)[0]
            timestamp = int(time.time() * 1000)
            nuevo_nombre_jpg = f"{nombre_base}_{timestamp}.jpg"
            ruta_salida = os.path.join(carpeta_salida, nuevo_nombre_jpg)

            print(f"Procesando: {nombre_archivo}...")

            with Image.open(ruta_entrada) as img:
                
                # --- INICIO DE LA NUEVA LÓGICA INTELIGENTE ---

                # SI LA IMAGEN YA ES PEQUEÑA, NO LA RE-PROCESAMOS
                if img.width <= tamaño_maximo[0] and img.height <= tamaño_maximo[1]:
                    print(f"-> Aviso: La imagen ya tiene el tamaño adecuado. Se copiará sin reprocesar para mantener el peso original.")
                    # Si no es JPG, la convertimos a JPG antes de copiar
                    if img.format != 'JPEG':
                         img.convert('RGB').save(ruta_salida, 'JPEG', quality=calidad_jpg)
                    else:
                        shutil.copy(ruta_entrada, ruta_salida) # Copia el archivo original directamente
                    contador += 1
                    continue # Pasa al siguiente archivo

                # SI LA IMAGEN ES GRANDE, LA PROCESAMOS
                if img.mode == 'RGBA' or img.mode == 'P':
                    # Convertir imágenes con transparencia o paleta de colores a RGB
                    img = img.convert('RGB')

                # Redimensionar manteniendo la proporción
                img.thumbnail(tamaño_maximo, Image.Resampling.LANCZOS)

                # Aplicar rotación si es necesario
                if rotation == 'left':
                    img = img.rotate(90, expand=True)
                elif rotation == 'right':
                    img = img.rotate(-90, expand=True)

                # Guardar con calidad optimizada
                img.save(ruta_salida, 'JPEG', quality=calidad_jpg, optimize=True)
                
                # --- FIN DE LA NUEVA LÓGICA ---

                print(f"-> ¡Éxito! Optimizado y guardado como '{nuevo_nombre_jpg}'")
                contador += 1
        except Exception as e:
            print(f"-> ERROR procesando {nombre_archivo}: {e}")

print(f"\n--- ¡Proceso completado! ---")
print(f"Total de imágenes procesadas: {contador}")