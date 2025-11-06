from fastapi import APIRouter, UploadFile, File

router = APIRouter()

@router.post("/search/by-photo")
async def search_by_photo(file: UploadFile = File(...)):
    return {
        "message": "Поиск по фото", 
        "filename": file.filename,
        "found": True
    }