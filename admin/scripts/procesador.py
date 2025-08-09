import os
from PIL import Image

try:
    from rembg import remove
except ImportError:
    print("Error: La librería 'rembg' no está instalada. Por favor, instálala con: pip install rembg")
    exit()

# --- CONFIGURACIÓN MEJORADA ---
# Se define la ruta base del script para que SIEMPRE encuentre sus carpetas.
# Esta es la corrección clave.
try:
    script_dir = os.path.dirname(os.path.abspath(__file__))
except NameError:
    # Fallback por si __file__ no está definido en algún entorno
    script_dir = os.getcwd()

carpeta_entrada = os.path.join(script_dir, 'entrada')
carpeta_salida = os.path.join(script_dir, 'salida_ia')
tamaño_final = (500, 500)
padding_porcentaje = 0.10
extensiones_validas = ('.png', '.jpg', '.jpeg', '.webp')
# --- FIN DE LA CONFIGURACIÓN ---

# Aseguramos que la carpeta de salida exista
if not os.path.exists(carpeta_salida):
    os.makedirs(carpeta_salida)
    print(f"Carpeta de salida creada en: {os.path.abspath(carpeta_salida)}")

# Verificamos que la carpeta de entrada exista
try:
    if not os.path.exists(carpeta_entrada):
        # Este es el error que estás viendo. El nuevo print te dirá la ruta exacta que está buscando.
        print(f"ERROR CRITICO: No se pudo encontrar la carpeta 'entrada'. Se esperaba en la ruta: {os.path.abspath(carpeta_entrada)}")
        exit()
    archivos = os.listdir(carpeta_entrada)
except Exception as e:
    print(f"ERROR al leer la carpeta de entrada: {e}")
    exit()

if not archivos:
    print("AVISO: La carpeta 'entrada' está vacía. No hay imágenes que procesar.")
    exit()

print(f"Iniciando proceso para {len(archivos)} archivos encontrados...")
contador = 0

for nombre_archivo in archivos:
    if nombre_archivo.lower().endswith(extensiones_validas):
        try:
            print(f"Procesando: {nombre_archivo}...")
            nombre_base = os.path.splitext(nombre_archivo)[0]
            nuevo_nombre_jpg = f"{nombre_base}.jpg"
            ruta_entrada = os.path.join(carpeta_entrada, nombre_archivo)
            ruta_salida = os.path.join(carpeta_salida, nuevo_nombre_jpg)
            
            with Image.open(ruta_entrada) as img_original:
                img_sin_fondo = remove(img_original)
                fondo_blanco = Image.new("RGBA", tamaño_final, (255, 255, 255, 255))
                ancho_maximo = int(tamaño_final[0] * (1 - padding_porcentaje))
                alto_maximo = int(tamaño_final[1] * (1 - padding_porcentaje))
                tamaño_con_padding = (ancho_maximo, alto_maximo)
                img_sin_fondo.thumbnail(tamaño_con_padding, Image.Resampling.LANCZOS)
                pos_x = (tamaño_final[0] - img_sin_fondo.width) // 2
                pos_y = (tamaño_final[1] - img_sin_fondo.height) // 2
                fondo_blanco.paste(img_sin_fondo, (pos_x, pos_y), img_sin_fondo)
                imagen_final_rgb = fondo_blanco.convert("RGB")
                imagen_final_rgb.save(ruta_salida, quality=95)
                print(f"-> ¡Éxito! Guardado como '{nuevo_nombre_jpg}'")
                contador += 1
        except Exception as e:
            print(f"-> ERROR procesando {nombre_archivo}: {e}")

print(f"\n--- ¡Proceso completado! ---")
print(f"Total de imágenes procesadas: {contador}")