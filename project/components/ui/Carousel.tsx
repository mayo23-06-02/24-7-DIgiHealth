import React from "react";
import { BiChevronLeft, BiChevronRight } from "react-icons/bi";
import "react-responsive-carousel/lib/styles/carousel.min.css";
import { Carousel as ReactCarousel } from "react-responsive-carousel";

interface CarouselProps {
  children: React.ReactChild[];
  showArrows?: boolean;
  showStatus?: boolean;
  showIndicators?: boolean;
  infiniteLoop?: boolean;
  centerMode?: boolean;
  centerSlidePercentage?: number;
  selectedItem?: number;
  onChange?: (index: number) => void;
  className?: string;
}

const Carousel: React.FC<CarouselProps> = ({
  children,
  showArrows = false, // We often use custom arrows in this project
  showStatus = false,
  showIndicators = false,
  infiniteLoop = false,
  centerMode = false,
  centerSlidePercentage = 100,
  selectedItem,
  onChange,
  className = "",
}) => {
  return (
    <div className={`relative group/carousel h-full ${className}`}>
      <ReactCarousel
        showArrows={false}
        showStatus={showStatus}
        showIndicators={showIndicators}
        infiniteLoop={infiniteLoop}
        swipeable={true}
        emulateTouch={true}
        centerMode={centerMode}
        centerSlidePercentage={centerSlidePercentage}
        selectedItem={selectedItem}
        onChange={onChange}
        className="h-full"
        renderArrowPrev={(onClickHandler, hasPrev) =>
          showArrows &&
          hasPrev && (
            <button
              onClick={onClickHandler}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md shadow-none border border-white flex items-center justify-center text-slate-400 hover:text-primary transition-all opacity-0 group-hover/carousel:opacity-100"
            >
              <BiChevronLeft size={24} />
            </button>
          )
        }
        renderArrowNext={(onClickHandler, hasNext) =>
          showArrows &&
          hasNext && (
            <button
              onClick={onClickHandler}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md shadow-none border border-white flex items-center justify-center text-slate-400 hover:text-primary transition-all opacity-0 group-hover/carousel:opacity-100"
            >
              <BiChevronRight size={24} />
            </button>
          )
        }
      >
        {children}
      </ReactCarousel>
    </div>
  );
};

export default Carousel;
