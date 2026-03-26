import { Router } from 'express';
export const materialGeometryRouter = Router();
materialGeometryRouter.get('/material-geometry/model', (_req, res) => {
    res.json({
        version: '0.1',
        materialFields: [
            { key: 'id', label: 'Идентификатор', type: 'uuid', required: true, comment: 'PK' },
            { key: 'organizationId', label: 'Организация', type: 'uuid', required: true, comment: 'Tenant' },
            { key: 'name', label: 'Наименование', type: 'string', required: true },
            { key: 'code', label: 'Код', type: 'string', required: false },
            {
                key: 'densityKgM3',
                label: 'Плотность (кг/м3)',
                type: 'float',
                required: false,
                comment: 'База для будущих расчетов веса',
            },
            {
                key: 'properties',
                label: 'Свойства материала',
                type: 'json',
                required: false,
                comment: 'Универсальное хранилище тех.параметров',
            },
            { key: 'colorName', label: 'Цвет (название)', type: 'string', required: false, comment: 'Для UI' },
            {
                key: 'colorHex',
                label: 'Цвет (HEX)',
                type: 'string',
                required: false,
                comment: 'Например `#2F6BFF`',
            },
            { key: 'notes', label: 'Заметки', type: 'string', required: false },
            { key: 'isActive', label: 'Активен', type: 'boolean', required: false, comment: 'Деактивация вместо удаления' },
        ],
        geometryFields: [
            { key: 'id', label: 'Идентификатор', type: 'uuid', required: true, comment: 'PK' },
            { key: 'organizationId', label: 'Организация', type: 'uuid', required: true, comment: 'Tenant' },
            { key: 'name', label: 'Наименование', type: 'string', required: true },
            {
                key: 'shapeKey',
                label: 'Тип геометрии',
                type: 'string',
                required: true,
                comment: 'rectangular / cylindrical / tube / plate / custom',
            },
            { key: 'heightMm', label: 'Высота (мм)', type: 'float', required: false },
            { key: 'lengthMm', label: 'Длина (мм)', type: 'float', required: false },
            { key: 'widthMm', label: 'Ширина (мм)', type: 'float', required: false },
            { key: 'diameterMm', label: 'Диаметр (мм)', type: 'float', required: false },
            { key: 'thicknessMm', label: 'Толщина (мм)', type: 'float', required: false },
            {
                key: 'extraParameters',
                label: 'Доп. параметры (универсально)',
                type: 'json',
                required: false,
                comment: 'Кастомные параметры для нестандартных формул',
            },
            { key: 'notes', label: 'Заметки', type: 'string', required: false },
            { key: 'isActive', label: 'Активен', type: 'boolean', required: false, comment: 'Деактивация вместо удаления' },
        ],
    });
});
