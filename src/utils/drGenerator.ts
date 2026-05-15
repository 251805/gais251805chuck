import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import JSZipUtils from 'jszip-utils';

import { supabase } from '../lib/supabase';

function loadFile(url: string, callback: (err: any, data: any) => void) {
    JSZipUtils.getBinaryContent(url, callback);
}

export const generateDRDocx = async (drId: string) => {
    // 1. Fetch full DR data with GSOID and Line Items
    const { data: dr, error: drError } = await supabase
        .from('delivery_receipts')
        .select(`
            *,
            gsoid_ref:gsoid (
                *,
                line_items (*)
            )
        `)
        .eq('id', drId)
        .single();

    if (drError || !dr) {
        console.error("Failed to fetch DR data:", drError);
        throw new Error("Could not find Delivery Receipt data.");
    }

    const { data: { publicUrl: templatePath } } = supabase.storage.from('gais251805').getPublicUrl('DR.docx');

    return new Promise((resolve, reject) => {
        loadFile(templatePath, (error, content) => {
            if (error) {
                console.error("Failed to load DR template:", error);
                reject(new Error("TEMPLATE NOT FOUND: The 'DR.docx' file is missing."));
                return;
            }

            try {
                const zip = new PizZip(content);
                const doc = new Docxtemplater(zip, {
                    paragraphLoop: true,
                    linebreaks: true,
                    delimiters: { start: '{{', end: '}}' },
                });

                const gsoData = dr.gsoid_ref;
                const items = gsoData?.line_items || [];
                
                const dateObj = dr.inspection_date ? new Date(dr.inspection_date) : new Date();
                const formattedDate = dateObj.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                });

                // Map data according to user's specified placeholders
                const docData = {
                    DEPARTMENT: gsoData?.department?.toUpperCase() || '',
                    SECTION: items[0]?.section?.toUpperCase() || '',
                    DATE: formattedDate,
                    PR: gsoData?.pr || '',
                    REQUESTED_BY: gsoData?.requested_by?.toUpperCase() || '',
                    BUDGET: gsoData?.budget || '',
                    GSOID: dr.gsoid,
                    BAC: gsoData?.bac || '',
                    DR_NUMBER: dr.dr_number,
                    STOCK_NO: items.map(i => i.stock_no || '').join('\n'),
                    UNIT: items.map(i => i.unit || '').join('\n'),
                    ITEM_DESCRIPTION: items.map(i => i.item_description || '').join('\n'),
                    QTY: items.map(i => i.qty || '').join('\n'),
                    UNIT_COST: items.map(i => i.unit_cost ? Number(i.unit_cost).toLocaleString() : '').join('\n'),
                    TOTAL_COST: items.map(i => i.total_cost ? Number(i.total_cost).toLocaleString() : '').join('\n'),
                    ACTUAL_ITEMS_RECEIVED: dr.actual_items_received,
                    INSPECTION_STATUS: dr.inspection_status,
                    INSPECTION_DATE: formattedDate,
                    INSPECTED_BY: dr.inspected_by?.toUpperCase() || '',
                    REMARKS: dr.warehouse_remarks || '',
                };

                doc.setData(docData);
                doc.render();

                const out = doc.getZip().generate({
                    type: "blob",
                    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                });

                saveAs(out, `DR_${dr.dr_number}.docx`);
                resolve(true);
            } catch (err: any) {
                console.error("Docx Generation Error (DR):", err);
                reject(err);
            }
        });
    });
};
