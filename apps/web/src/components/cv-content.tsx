'use client';

import CVPDF from './cv-pdf';
import { DownloadCVButton } from './download-cv-button';


export default function CVContent() {
    return (
        <div className="relative flex justify-center px-4 md:px-8 py-12">
            <DownloadCVButton />
            <CVPDF />
        </div>
    );
}
